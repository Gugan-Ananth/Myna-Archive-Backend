import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { normalizeTags } from "../common/normalize-tags";
import { BunnyService } from "../media/bunny.service";
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
  MAX_IMAGE_ASSETS,
  type MediaAssetResponse,
} from "./dto/media-asset.dto";
import { UpdateArchiveItemDto } from "./dto/update-archive-item.dto";
import { ArchiveItemEntity } from "./entities/archive-item.entity";

@Injectable()
export class ArchiveItemsService {
  private readonly logger = new Logger(ArchiveItemsService.name);

  constructor(
    @InjectRepository(ArchiveItemEntity)
    private readonly archiveItems: Repository<ArchiveItemEntity>,
    private readonly bunny: BunnyService,
    private readonly taxonomy: TaxonomyService,
  ) {}

  async create(dto: CreateArchiveItemDto): Promise<ArchiveItemResponse> {
    const tags = normalizeTags(dto.tags);
    if (tags.length === 0) {
      throw new BadRequestException(
        "At least one non-empty tag is required after normalization",
      );
    }
    // Persist any new category:tag pairs into the taxonomy vocabulary.
    await this.taxonomy.ensureEncodedTags(tags);

    const assetInputs = this.normalizeAssetInputs(dto);
    this.assertAssetRules(dto.mediaType, assetInputs);

    // Verify all Bunny assets (parallel — multi-image groups can be up to 10).
    const mediaAssets = await Promise.all(
      assetInputs.map((asset) => this.verifyAsset(dto.mediaType, asset)),
    );

    const cover = mediaAssets[0];
    if (!cover) {
      throw new BadRequestException("At least one media asset is required");
    }

    const entity = this.archiveItems.create({
      name: dto.name.trim(),
      description: dto.description?.trim() ?? "",
      tags,
      rating: dto.rating,
      mediaType: dto.mediaType,
      thumbnailUrl: cover.thumbnailUrl,
      mediaUrl: cover.mediaUrl,
      width: cover.width,
      height: cover.height,
      blurHash: cover.blurHash,
      publicId: cover.publicId,
      resourceType: cover.resourceType,
      mediaAssets,
    });

    const saved = await this.archiveItems.save(entity);
    return toArchiveItemResponse(saved);
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

    if (query.tag && query.tag.length > 0) {
      const tags = normalizeTags(query.tag);
      if (tags.length > 0) {
        qb.andWhere("item.tags @> :filterTags", { filterTags: tags });
      }
    }

    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(item.name) LIKE :q OR LOWER(item.description) LIKE :q OR EXISTS (
          SELECT 1 FROM unnest(item.tags) AS t WHERE LOWER(t) LIKE :q
        ))`,
        { q },
      );
    }

    qb.orderBy("item.rating", "DESC").addOrderBy("item.name", "ASC");

    const total = await qb.getCount();
    const entities = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      data: entities.map(toArchiveItemResponse),
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
    return toArchiveItemResponse(entity);
  }

  async update(
    id: string,
    dto: UpdateArchiveItemDto,
  ): Promise<ArchiveItemResponse> {
    const entity = await this.findEntityOrFail(id);

    if (dto.name !== undefined) {
      entity.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      entity.description = dto.description.trim();
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

    const saved = await this.archiveItems.save(entity);
    return toArchiveItemResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findEntityOrFail(id);
    const assets = resolveMediaAssets(entity);

    // Destroy every Bunny asset in the group (best-effort per asset).
    for (const asset of assets) {
      const resourceType = asset.resourceType === "video" ? "video" : "image";
      await this.bunny.destroy(asset.publicId, resourceType);
    }

    await this.archiveItems.remove(entity);
    this.logger.log(
      `Deleted archive item ${id} (${assets.length} media asset(s))`,
    );
  }

  private normalizeAssetInputs(
    dto: CreateArchiveItemDto,
  ): CreateMediaAssetDto[] {
    if (dto.assets && dto.assets.length > 0) {
      return dto.assets;
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
    mediaType: "image" | "video",
    assets: CreateMediaAssetDto[],
  ): void {
    const publicIds = assets.map((a) => a.publicId.trim());
    if (new Set(publicIds).size !== publicIds.length) {
      throw new BadRequestException(
        "Each media asset must have a unique publicId",
      );
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
      thumbnailUrl: urls.thumbnailUrl,
      width,
      height,
      blurHash: blurHash.length > 0 ? blurHash : null,
    };
  }

  private async findEntityOrFail(id: string): Promise<ArchiveItemEntity> {
    const entity = await this.archiveItems.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Archive item not found: ${id}`);
    }
    return entity;
  }
}
