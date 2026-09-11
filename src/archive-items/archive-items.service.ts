import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { normalizeTags } from "../common/normalize-tags";
import type { ArchiveSection } from "../common/archive-section";
import {
  CAPTION_ASSET_COUNT,
  MAX_CAPTION_STORY_CHARS,
  captionSourcePublicId,
  normalizeCaptionStory,
  parseCaptionSpec,
  type CaptionSpec,
} from "../common/caption-spec";
import {
  MAX_STARS_PER_CATEGORY,
  type StarCategory,
} from "../common/star-category";
import {
  applyStoryAssets,
  MAX_STORY_ASSETS,
  partitionStoryAssets,
  sanitizeStoryHtml,
} from "../common/story-html";
import type { MediaType } from "../common/media-type";
import { mapLimit } from "../common/map-limit";
import { BunnyService } from "../media/bunny.service";
import { ImagePreviewService } from "../media/image-preview.service";
import { TaxonomyService } from "../taxonomy/taxonomy.service";
import {
  resolveMediaAssets,
  toArchiveItemResponse,
  type ArchiveItemResponse,
  type PaginatedArchiveItemsResponse,
} from "./dto/archive-item-response.dto";
import { CreateArchiveItemDto } from "./dto/create-archive-item.dto";
import { ListArchiveItemsQueryDto } from "./dto/list-archive-items-query.dto";
import {
  CreateMediaAssetDto,
  MAX_COMIC_ASSETS,
  MAX_IMAGE_ASSETS,
  type MediaAssetResponse,
} from "./dto/media-asset.dto";
import {
  MAX_STORY_CHARACTERS,
  StoryCharacterInputDto,
  type StoryCharacterResponse,
} from "./dto/story-character.dto";
import { UpdateArchiveItemDto } from "./dto/update-archive-item.dto";
import { ArchiveItemEntity } from "./entities/archive-item.entity";

@Injectable()
export class ArchiveItemsService {
  private readonly logger = new Logger(ArchiveItemsService.name);

  constructor(
    @InjectRepository(ArchiveItemEntity)
    private readonly archiveItems: Repository<ArchiveItemEntity>,
    private readonly bunny: BunnyService,
    private readonly previews: ImagePreviewService,
    private readonly taxonomy: TaxonomyService,
  ) {}

  async create(dto: CreateArchiveItemDto): Promise<ArchiveItemResponse> {
    const tags = normalizeTags(dto.tags);
    if (tags.length === 0) {
      throw new BadRequestException(
        "At least one non-empty tag is required after normalization",
      );
    }
    if (dto.mediaType !== "story" && (dto.characters?.length ?? 0) > 0) {
      throw new BadRequestException("Only stories can have characters");
    }
    // Persist any new category:tag pairs into the taxonomy vocabulary.
    await this.taxonomy.ensureEncodedTags(tags);

    const assetInputs = this.normalizeAssetInputs(dto);
    const section: ArchiveSection = dto.section ?? "images";
    if (dto.mediaType !== "image" && section !== "images") {
      throw new BadRequestException(
        "Only image items can be stored in the cute-things section",
      );
    }
    this.assertAssetRules(dto.mediaType, assetInputs, section);

    let bodyHtml = "";
    let captionSpec: CaptionSpec | null = null;
    if (dto.mediaType === "caption") {
      bodyHtml = this.requireCaptionStory(dto.bodyHtml);
      captionSpec = await this.hydrateCaptionSpec(dto.captionSpec);
    }

    const verifyType: "image" | "video" =
      dto.mediaType === "video" ? "video" : "image";
    const mediaAssets = await mapLimit(assetInputs, 3, (asset) =>
      this.verifyAsset(verifyType, asset),
    );

    if (dto.mediaType === "story") {
      const raw = sanitizeStoryHtml(dto.bodyHtml ?? "");
      const parts = partitionStoryAssets(raw, mediaAssets);
      if (!parts) {
        throw new BadRequestException(
          "Story body image count must match assets[] length and order",
        );
      }
      bodyHtml = applyStoryAssets(raw, parts.body);
    }

    const cover = mediaAssets[0];
    if (!cover && dto.mediaType !== "story") {
      throw new BadRequestException("At least one media asset is required");
    }

    const series = await this.resolveStorySeries(dto);
    const characters =
      dto.mediaType === "story"
        ? await this.resolveStoryCharacterInputs(dto.characters)
        : [];

    const entity = this.archiveItems.create({
      name: dto.name.trim(),
      description: dto.description?.trim() ?? "",
      author: dto.mediaType === "story" ? (dto.author?.trim() ?? "") : "",
      bodyHtml,
      summary: dto.summary?.trim() ?? "",
      captionSpec,
      tags,
      rating: dto.rating,
      mediaType: dto.mediaType,
      section,
      seriesId: series.seriesId,
      chapterNumber: series.chapterNumber,
      thumbnailUrl: cover?.thumbnailUrl ?? "",
      mediaUrl: cover?.mediaUrl ?? "",
      width: cover?.width ?? null,
      height: cover?.height ?? null,
      blurHash: cover?.blurHash ?? null,
      publicId: cover?.publicId ?? "",
      resourceType: cover?.resourceType ?? "image",
      mediaAssets: mediaAssets.length > 0 ? mediaAssets : [],
      characters,
    });

    const saved = await this.archiveItems.save(entity);
    const chapterCount =
      dto.mediaType === "story"
        ? await this.chapterCountForRoot(saved.seriesId ?? saved.id)
        : 1;
    return toArchiveItemResponse(saved, { chapterCount });
  }

  async findAll(
    query: ListArchiveItemsQueryDto,
  ): Promise<PaginatedArchiveItemsResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.archiveItems.createQueryBuilder("item");

    if (query.mediaType) {
      qb.andWhere("item.mediaType = :mediaType", {
        mediaType: query.mediaType,
      });
    }

    if (query.section) {
      qb.andWhere("item.section = :section", {
        section: query.section,
      });
    }

    if (query.starred !== undefined) {
      qb.andWhere("item.starred = :starred", {
        starred: query.starred,
      });
    }

    if (query.storyRoot) {
      qb.andWhere("item.seriesId IS NULL");
    }

    if (query.imageGroup === true) {
      qb.andWhere("item.mediaAssetCount >= 2");
    } else if (query.imageGroup === false) {
      qb.andWhere("item.mediaAssetCount <= 1");
    }

    if (query.tag && query.tag.length > 0) {
      const tags = normalizeTags(query.tag);
      if (tags.length > 0) {
        qb.andWhere("item.tags @> :filterTags", { filterTags: tags });
      }
    }

    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      const searchClauses = [
        "LOWER(item.name) LIKE :q",
        "LOWER(item.description) LIKE :q",
        ...(query.mediaType &&
        query.mediaType !== "story" &&
        query.mediaType !== "caption"
          ? []
          : ["LOWER(item.bodyHtml) LIKE :q"]),
        `EXISTS (
          SELECT 1 FROM unnest(item.tags) AS t WHERE LOWER(t) LIKE :q
        )`,
      ];
      qb.andWhere(
        `(${searchClauses.join(" OR ")})`,
        { q },
      );
    }

    qb.orderBy("item.rating", "DESC").addOrderBy("item.name", "ASC");

    // List cards do not need the potentially large story body for non-story
    // queries. Keep the response shape intact: the mapper defaults bodyHtml
    // to an empty string when the column is not selected.
    const listColumns = [
      "item.id",
      "item.name",
      "item.description",
      "item.author",
      "item.summary",
      "item.tags",
      "item.rating",
      "item.mediaType",
      "item.starred",
      "item.section",
      "item.seriesId",
      "item.chapterNumber",
      "item.thumbnailUrl",
      "item.mediaUrl",
      "item.width",
      "item.height",
      "item.blurHash",
      "item.publicId",
      "item.resourceType",
      "item.mediaAssets",
      "item.characters",
    ];
    if (
      !query.mediaType ||
      query.mediaType === "story" ||
      query.mediaType === "caption"
    ) {
      listColumns.push("item.bodyHtml");
    }
    if (!query.mediaType || query.mediaType === "caption") {
      listColumns.push("item.captionSpec");
    }

    qb.select(listColumns).addSelect("COUNT(*) OVER()", "total_count");
    const { entities, raw } = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities<{ total_count: string }>();
    const firstRow = raw[0];
    // Window aggregates have no row to carry the total when a client asks for
    // a page beyond the end. Preserve the old pagination metadata in that
    // uncommon case with a count-only fallback.
    const total = firstRow
      ? Number(firstRow.total_count)
      : await qb.clone().skip(undefined).take(undefined).getCount();

    const counts = await this.chapterCountsForRoots(
      entities
        .filter((item) => item.mediaType === "story" && !item.seriesId)
        .map((item) => item.id),
    );

    return {
      data: entities.map((item) =>
        toArchiveItemResponse(item, {
          chapterCount: counts.get(item.id) ?? 1,
        }),
      ),
      meta: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string): Promise<ArchiveItemResponse> {
    const entity = await this.findEntityOrFail(id);
    const rootId =
      entity.mediaType === "story" ? (entity.seriesId ?? entity.id) : entity.id;
    const chapterCount =
      entity.mediaType === "story" ? await this.chapterCountForRoot(rootId) : 1;
    return toArchiveItemResponse(entity, { chapterCount });
  }

  async listChapters(
    id: string,
  ): Promise<{ data: ArchiveItemResponse[] }> {
    const entity = await this.findEntityOrFail(id);
    if (entity.mediaType !== "story") {
      throw new BadRequestException("Chapters are only available for stories");
    }
    const rootId = entity.seriesId ?? entity.id;
    const chapters = await this.archiveItems.find({
      where: [
        { id: rootId, mediaType: "story" },
        { seriesId: rootId, mediaType: "story" },
      ],
      order: { chapterNumber: "ASC" },
    });
    const chapterCount = chapters.length;
    return {
      data: chapters.map((item) =>
        toArchiveItemResponse(item, { chapterCount }),
      ),
    };
  }

  async update(
    id: string,
    dto: UpdateArchiveItemDto,
  ): Promise<ArchiveItemResponse> {
    const entity = await this.findEntityOrFail(id);

    if (dto.starred === true && !entity.starred) {
      await this.assertStarAvailable(entity);
    }
    if (dto.starred !== undefined) {
      entity.starred = dto.starred;
    }

    if (dto.name !== undefined) {
      entity.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      entity.description = dto.description.trim();
    }
    if (entity.mediaType === "story" && dto.author !== undefined) {
      entity.author = dto.author.trim();
    }
    if (dto.summary !== undefined) {
      entity.summary = dto.summary.trim();
    }
    if (entity.mediaType === "caption") {
      if (dto.bodyHtml !== undefined) {
        entity.bodyHtml = this.requireCaptionStory(dto.bodyHtml);
      }
      const previousSource = captionSourcePublicId(entity.captionSpec);
      if (dto.captionSpec !== undefined) {
        entity.captionSpec = await this.hydrateCaptionSpec(dto.captionSpec);
      }
      if (dto.assets !== undefined) {
        this.assertAssetRules("caption", dto.assets);
        const mediaAssets = await mapLimit(dto.assets, 3, (asset) =>
          this.verifyAsset("image", asset),
        );
        await this.destroyUnusedMediaAssets(entity, mediaAssets, [
          captionSourcePublicId(entity.captionSpec),
        ]);
        const cover = mediaAssets[0];
        entity.mediaAssets = mediaAssets;
        entity.thumbnailUrl = cover?.thumbnailUrl ?? "";
        entity.mediaUrl = cover?.mediaUrl ?? "";
        entity.width = cover?.width ?? null;
        entity.height = cover?.height ?? null;
        entity.blurHash = cover?.blurHash ?? null;
        entity.publicId = cover?.publicId ?? "";
        entity.resourceType = cover?.resourceType ?? "image";
      }
      const nextSource = captionSourcePublicId(entity.captionSpec);
      if (previousSource && previousSource !== nextSource) {
        await this.destroyCaptionFile(previousSource);
      }
    }
    if (entity.mediaType === "story") {
      if (dto.assets !== undefined) {
        this.assertAssetRules("story", dto.assets);
        const mediaAssets = await mapLimit(dto.assets, 3, (asset) =>
          this.verifyAsset("image", asset),
        );
        const raw = sanitizeStoryHtml(dto.bodyHtml ?? entity.bodyHtml ?? "");
        const parts = partitionStoryAssets(raw, mediaAssets);
        if (!parts) {
          throw new BadRequestException(
            "Story body image count must match assets[] length and order",
          );
        }
        entity.bodyHtml = applyStoryAssets(raw, parts.body);
        const cover = mediaAssets[0];
        entity.mediaAssets = mediaAssets;
        entity.thumbnailUrl = cover?.thumbnailUrl ?? "";
        entity.mediaUrl = cover?.mediaUrl ?? "";
        entity.width = cover?.width ?? null;
        entity.height = cover?.height ?? null;
        entity.blurHash = cover?.blurHash ?? null;
        entity.publicId = cover?.publicId ?? "";
        entity.resourceType = cover?.resourceType ?? "image";
      } else if (dto.bodyHtml !== undefined) {
        const raw = sanitizeStoryHtml(dto.bodyHtml);
        const existing = resolveMediaAssets(entity);
        const parts = partitionStoryAssets(entity.bodyHtml ?? "", existing);
        const body = parts?.body ?? existing;
        const next = partitionStoryAssets(
          raw,
          parts?.cover ? [parts.cover, ...body] : body,
        );
        if (!next) {
          throw new BadRequestException(
            "Story body image count must match assets[] length and order",
          );
        }
        entity.bodyHtml = applyStoryAssets(raw, next.body);
      }
    }
    if (dto.rating !== undefined) {
      entity.rating = dto.rating;
    }
    if (dto.tags !== undefined) {
      const tags = normalizeTags(dto.tags);
      if (tags.length === 0) {
        throw new BadRequestException(
          "At least one non-empty tag is required after normalization",
        );
      }
      await this.taxonomy.ensureEncodedTags(tags);
      entity.tags = tags;
    }
    if (dto.characters !== undefined) {
      if (entity.mediaType !== "story") {
        throw new BadRequestException("Only stories can have characters");
      }
      const next = await this.resolveStoryCharacterInputs(dto.characters);
      await this.destroyUnusedCharacterPortraits(entity, next);
      entity.characters = next;
    }

    const saved = await this.archiveItems.save(entity);
    const rootId =
      saved.mediaType === "story" ? (saved.seriesId ?? saved.id) : saved.id;
    const chapterCount =
      saved.mediaType === "story" ? await this.chapterCountForRoot(rootId) : 1;
    return toArchiveItemResponse(saved, { chapterCount });
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findEntityOrFail(id);

    if (entity.mediaType === "story") {
      await this.removeStoryChapter(entity);
      return;
    }

    const assets = resolveMediaAssets(entity);
    await this.destroyItemAssets(entity);
    await this.archiveItems.remove(entity);
    this.logger.log(
      `Deleted archive item ${id} (${assets.length} media asset(s))`,
    );
  }

  /**
   * Delete only this chapter. Remaining chapters are reassigned consecutive
   * numbers in order (delete 10 and 11 becomes 10). If the series root is
   * deleted and later chapters remain, promote the lowest remaining chapter
   * to root (same story name) as the new chapter 1.
   */
  private async removeStoryChapter(
    entity: ArchiveItemEntity,
  ): Promise<void> {
    const isRoot = !entity.seriesId;
    const rootId = entity.seriesId ?? entity.id;
    const series = await this.archiveItems.find({
      where: [
        { id: rootId, mediaType: "story" },
        { seriesId: rootId, mediaType: "story" },
      ],
    });
    const remaining = series
      .filter((chapter) => chapter.id !== entity.id)
      .sort(
        (a, b) => (a.chapterNumber ?? 1) - (b.chapterNumber ?? 1),
      );

    const assets = resolveMediaAssets(entity);
    await this.destroyItemAssets(entity);
    await this.archiveItems.remove(entity);

    const promoted = isRoot ? remaining[0] : undefined;
    for (let i = 0; i < remaining.length; i += 1) {
      const chapter = remaining[i];
      if (!chapter) continue;
      const nextNumber = i + 1;
      let dirty = false;

      if (promoted) {
        if (chapter.id === promoted.id) {
          chapter.seriesId = null;
          chapter.name = entity.name;
          if (!chapter.summary?.trim() && entity.summary) {
            chapter.summary = entity.summary;
          }
          if (!chapter.author?.trim() && entity.author) {
            chapter.author = entity.author;
          }
          dirty = true;
        } else {
          chapter.seriesId = promoted.id;
          dirty = true;
        }
      }

      if ((chapter.chapterNumber ?? 1) !== nextNumber) {
        chapter.chapterNumber = nextNumber;
        dirty = true;
      }

      if (dirty) {
        await this.archiveItems.save(chapter);
      }
    }

    this.logger.log(
      `Deleted story chapter ${entity.id} (${assets.length} media asset(s))`,
    );
  }

  private normalizeAssetInputs(
    dto: CreateArchiveItemDto,
  ): CreateMediaAssetDto[] {
    if (dto.assets && dto.assets.length > 0) {
      return dto.assets;
    }

    if (dto.mediaType === "story") {
      return [];
    }

    if (!dto.publicId || !dto.resourceType) {
      throw new BadRequestException(
        "Provide either assets[] or publicId + resourceType",
      );
    }

    return [
      {
        publicId: dto.publicId,
        resourceType: dto.resourceType,
        width: dto.width,
        height: dto.height,
        blurHash: dto.blurHash,
      },
    ];
  }

  private assertAssetRules(
    mediaType: MediaType,
    assets: CreateMediaAssetDto[],
    section: ArchiveSection = "images",
  ): void {
    const publicIds = assets.map((a) => a.publicId.trim());
    if (new Set(publicIds).size !== publicIds.length) {
      throw new BadRequestException(
        "Each media asset must have a unique publicId",
      );
    }

    if (section === "cute-things" && assets.length !== 1) {
      throw new BadRequestException(
        "Cute-things items must have exactly one image",
      );
    }

    if (mediaType === "story") {
      if (assets.length > MAX_STORY_ASSETS + 1) {
        throw new BadRequestException(
          `Stories may have at most ${MAX_STORY_ASSETS} inline images plus one cover`,
        );
      }
      for (const asset of assets) {
        if (asset.resourceType !== "image") {
          throw new BadRequestException("Story images must be resourceType image");
        }
      }
      return;
    }

    if (mediaType === "video") {
      if (assets.length !== 1) {
        throw new BadRequestException(
          "Video items must have exactly one media asset",
        );
      }
      if (assets[0]?.resourceType !== "video") {
        throw new BadRequestException(
          'Video items require resourceType "video"',
        );
      }
      return;
    }

    if (mediaType === "comic") {
      if (assets.length < 1 || assets.length > MAX_COMIC_ASSETS) {
        throw new BadRequestException(
          `Comics must have between 1 and ${MAX_COMIC_ASSETS} pages`,
        );
      }
      for (const asset of assets) {
        if (asset.resourceType !== "image") {
          throw new BadRequestException(
            "Comic pages must be resourceType image",
          );
        }
      }
      return;
    }

    if (mediaType === "caption") {
      if (assets.length !== CAPTION_ASSET_COUNT) {
        throw new BadRequestException(
          "Captions must have exactly one image asset (the generated still)",
        );
      }
      for (const asset of assets) {
        if (asset.resourceType !== "image") {
          throw new BadRequestException(
            "Caption assets must be resourceType image",
          );
        }
      }
      return;
    }

    // image (single or group)
    if (assets.length < 1 || assets.length > MAX_IMAGE_ASSETS) {
      throw new BadRequestException(
        `Image items must have between 1 and ${MAX_IMAGE_ASSETS} media assets`,
      );
    }
    for (const asset of assets) {
      if (asset.resourceType !== "image") {
        throw new BadRequestException(
          "Image groups may only contain image assets",
        );
      }
    }
  }

  private async assertStarAvailable(
    entity: ArchiveItemEntity,
  ): Promise<void> {
    const category = this.starCategoryFor(entity);
    const qb = this.archiveItems.createQueryBuilder("item");
    qb.where("item.starred = :starred", { starred: true });

    if (category === "images") {
      qb.andWhere(
        `item.mediaType = 'image' AND item.section = 'images' AND item.mediaAssetCount <= 1`,
      );
    } else if (category === "cute-things") {
      qb.andWhere(
        `item.mediaType = 'image' AND item.section = 'cute-things'`,
      );
    } else if (category === "collections") {
      qb.andWhere(`item.mediaType = 'image' AND item.mediaAssetCount >= 2`);
    } else {
      qb.andWhere("item.mediaType = :starMediaType", {
        starMediaType:
          category === "comics"
            ? "comic"
            : category === "captions"
              ? "caption"
              : category === "stories"
                ? "story"
                : category,
      });
    }

    const count = await qb.getCount();
    if (count >= MAX_STARS_PER_CATEGORY) {
      throw new BadRequestException(
        `You can star a maximum of ${MAX_STARS_PER_CATEGORY} items in the ${category} category`,
      );
    }
  }

  private starCategoryFor(entity: ArchiveItemEntity): StarCategory {
    if (entity.mediaType === "image") {
      if (entity.section === "cute-things") return "cute-things";
      return resolveMediaAssets(entity).length > 1
        ? "collections"
        : "images";
    }
    if (entity.mediaType === "comic") return "comics";
    if (entity.mediaType === "caption") return "captions";
    if (entity.mediaType === "video") return "videos";
    return "stories";
  }

  private async hydrateCaptionSpec(raw: unknown): Promise<CaptionSpec> {
    let spec: CaptionSpec;
    try {
      spec = parseCaptionSpec(raw);
    } catch {
      throw new BadRequestException("A valid captionSpec is required");
    }
    if (!spec.sourcePublicId) {
      throw new BadRequestException("Caption source image is required");
    }
    const { urls } = await this.bunny.verifyAndDeriveUrls({
      publicId: spec.sourcePublicId,
      resourceType: "image",
      mediaType: "image",
    });
    return {
      ...spec,
      sourceMediaUrl: urls.mediaUrl,
    };
  }

  private async destroyCaptionFile(publicId: string): Promise<void> {
    if (!publicId) return;
    await this.bunny.destroy(publicId, "image");
    await this.previews.destroyForOriginal(publicId);
  }

  private requireCaptionStory(raw: string | undefined): string {
    const text = normalizeCaptionStory(raw);
    if (!text) {
      throw new BadRequestException("Caption story is required");
    }
    if (text.length > MAX_CAPTION_STORY_CHARS) {
      throw new BadRequestException(
        `Caption story may be at most ${MAX_CAPTION_STORY_CHARS} characters`,
      );
    }
    return text;
  }

  private async destroyUnusedMediaAssets(
    entity: ArchiveItemEntity,
    next: MediaAssetResponse[],
    extraKeep: string[] = [],
  ): Promise<void> {
    const keep = new Set(
      [...next.map((asset) => asset.publicId), ...extraKeep].filter(Boolean),
    );
    const jobs: Promise<void>[] = [];
    const seen = new Set<string>();
    for (const asset of resolveMediaAssets(entity)) {
      const id = asset.publicId;
      if (!id || keep.has(id) || seen.has(id)) continue;
      seen.add(id);
      const resourceType = asset.resourceType === "video" ? "video" : "image";
      jobs.push(
        this.bunny.destroy(id, resourceType).then(async () => {
          if (resourceType === "image") {
            await this.previews.destroyForOriginal(id);
          }
        }),
      );
    }
    await Promise.all(jobs);
  }

  private async verifyAsset(
    mediaType: "image" | "video",
    asset: CreateMediaAssetDto,
  ): Promise<MediaAssetResponse> {
    const hasWidth = asset.width !== undefined && asset.width !== null;
    const hasHeight = asset.height !== undefined && asset.height !== null;
    if (hasWidth !== hasHeight) {
      throw new BadRequestException(
        "width and height must both be provided together for each asset",
      );
    }

    const blurHash =
      typeof asset.blurHash === "string" ? asset.blurHash.trim() : "";
    if (asset.blurHash !== undefined && blurHash.length === 0) {
      throw new BadRequestException("blurHash must not be empty");
    }

    const { resource, urls } = await this.bunny.verifyAndDeriveUrls({
      publicId: asset.publicId,
      resourceType: asset.resourceType,
      mediaType,
    });
    const thumbnailUrl =
      mediaType === "image"
        ? await this.previews.thumbnailUrlFor(asset.publicId, urls.thumbnailUrl)
        : urls.thumbnailUrl;

    let width: number | null = hasWidth ? Number(asset.width) : null;
    let height: number | null = hasHeight ? Number(asset.height) : null;

    if (mediaType === "video") {
      const streamW =
        resource.width && resource.width > 0 ? resource.width : null;
      const streamH =
        resource.height && resource.height > 0 ? resource.height : null;
      if (streamW && streamH) {
        width = streamW;
        height = streamH;
      }
    }

    return {
      publicId: asset.publicId,
      resourceType: asset.resourceType,
      mediaUrl: urls.mediaUrl,
      thumbnailUrl,
      width,
      height,
      blurHash: blurHash.length > 0 ? blurHash : null,
    };
  }

  private async resolveStorySeries(dto: CreateArchiveItemDto): Promise<{
    seriesId: string | null;
    chapterNumber: number;
  }> {
    if (dto.mediaType !== "story") {
      return { seriesId: null, chapterNumber: 1 };
    }
    if (!dto.seriesId) {
      return { seriesId: null, chapterNumber: 1 };
    }

    const parent = await this.findEntityOrFail(dto.seriesId);
    if (parent.mediaType !== "story") {
      throw new BadRequestException("Chapters can only be linked to a story");
    }
    const rootId = parent.seriesId ?? parent.id;
    const chapterNumber =
      dto.chapterNumber ?? (await this.nextChapterNumber(rootId));
    await this.assertChapterAvailable(rootId, chapterNumber);
    return { seriesId: rootId, chapterNumber };
  }

  private async nextChapterNumber(rootId: string): Promise<number> {
    const chapters = await this.archiveItems.find({
      where: [{ id: rootId }, { seriesId: rootId }],
      select: ["chapterNumber"],
    });
    const taken = new Set(
      chapters.map((item) => item.chapterNumber ?? 1),
    );
    let n = 1;
    while (taken.has(n)) n += 1;
    return n;
  }

  private async assertChapterAvailable(
    rootId: string,
    chapterNumber: number,
  ): Promise<void> {
    const taken = await this.archiveItems.findOne({
      where: [
        { id: rootId, chapterNumber },
        { seriesId: rootId, chapterNumber },
      ],
    });
    if (taken) {
      throw new BadRequestException(
        `Chapter ${chapterNumber} already exists in this story`,
      );
    }
  }

  private async chapterCountForRoot(rootId: string): Promise<number> {
    const counts = await this.chapterCountsForRoots([rootId]);
    return counts.get(rootId) ?? 1;
  }

  private async chapterCountsForRoots(
    rootIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    for (const id of rootIds) map.set(id, 1);
    if (rootIds.length === 0) return map;

    const rows: Array<{ sid: string; n: string }> = await this.archiveItems
      .createQueryBuilder("ch")
      .select("ch.seriesId", "sid")
      .addSelect("COUNT(*)", "n")
      .where("ch.seriesId IN (:...ids)", { ids: rootIds })
      .groupBy("ch.seriesId")
      .getRawMany();

    for (const row of rows) {
      map.set(row.sid, 1 + Number(row.n));
    }
    return map;
  }

  private async destroyItemAssets(entity: ArchiveItemEntity): Promise<void> {
    const assets = resolveMediaAssets(entity);
    const seen = new Set<string>();
    const jobs: Promise<void>[] = [];

    const queue = (publicId: string, resourceType: "image" | "video") => {
      const key = `${resourceType}:${publicId}`;
      if (!publicId || seen.has(key)) return;
      seen.add(key);
      jobs.push(
        this.bunny.destroy(publicId, resourceType).then(async () => {
          if (resourceType === "image") {
            await this.previews.destroyForOriginal(publicId);
          }
        }),
      );
    };

    for (const asset of assets) {
      if (!asset.publicId) continue;
      const resourceType = asset.resourceType === "video" ? "video" : "image";
      queue(asset.publicId, resourceType);
    }
    const sourceId = captionSourcePublicId(entity.captionSpec);
    if (sourceId) queue(sourceId, "image");
    for (const character of entity.characters ?? []) {
      if (character.publicId) queue(character.publicId, "image");
    }
    await Promise.all(jobs);
  }

  private async destroyUnusedCharacterPortraits(
    entity: ArchiveItemEntity,
    next: StoryCharacterResponse[],
  ): Promise<void> {
    const keep = new Set(
      next.map((row) => row.publicId).filter((id): id is string => Boolean(id)),
    );
    for (const asset of resolveMediaAssets(entity)) {
      if (asset.publicId) keep.add(asset.publicId);
    }
    const jobs: Promise<void>[] = [];
    const seen = new Set<string>();
    for (const character of entity.characters ?? []) {
      const id = character.publicId;
      if (!id || keep.has(id) || seen.has(id)) continue;
      seen.add(id);
      jobs.push(
        this.bunny.destroy(id, "image").then(() =>
          this.previews.destroyForOriginal(id),
        ),
      );
    }
    await Promise.all(jobs);
  }

  private async resolveStoryCharacterInputs(
    input?: StoryCharacterInputDto[],
  ): Promise<StoryCharacterResponse[]> {
    if (!input?.length) return [];
    if (input.length > MAX_STORY_CHARACTERS) {
      throw new BadRequestException(
        `Stories may have at most ${MAX_STORY_CHARACTERS} characters`,
      );
    }

    const seen = new Set<string>();
    const characters: StoryCharacterResponse[] = [];
    for (const row of input) {
      const name = row.name.trim().replace(/\s+/g, " ");
      if (!name) {
        throw new BadRequestException("Story character name is required");
      }
      const key = name.toLowerCase();
      if (seen.has(key)) {
        throw new BadRequestException("Story character names must be unique");
      }
      seen.add(key);

      const publicId = row.publicId?.trim() ?? "";
      if (!publicId) {
        characters.push({
          name,
          publicId: null,
          mediaUrl: "",
          thumbnailUrl: "",
          width: null,
          height: null,
          blurHash: null,
        });
        continue;
      }

      const verified = await this.verifyAsset("image", {
        publicId,
        resourceType: "image",
        width: row.width,
        height: row.height,
        blurHash: row.blurHash,
      });
      characters.push({
        name,
        publicId: verified.publicId,
        mediaUrl: verified.mediaUrl,
        thumbnailUrl: verified.thumbnailUrl,
        width: verified.width,
        height: verified.height,
        blurHash: verified.blurHash,
      });
    }
    return characters;
  }

  private async findEntityOrFail(id: string): Promise<ArchiveItemEntity> {
    const entity = await this.archiveItems.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Archive item not found: ${id}`);
    }
    return entity;
  }
}
