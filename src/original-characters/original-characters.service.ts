import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MAX_STARS_PER_CATEGORY } from "../common/star-category";
import { BunnyService } from "../media/bunny.service";
import { CreateOriginalCharacterDto } from "./dto/create-original-character.dto";
import { ListOriginalCharactersQueryDto } from "./dto/list-original-characters-query.dto";
import {
  toOriginalCharacterResponse,
  type OriginalCharacterResponse,
  type PaginatedOriginalCharactersResponse,
} from "./dto/original-character-response.dto";
import { UpdateOriginalCharacterDto } from "./dto/update-original-character.dto";
import { OriginalCharacterEntity } from "./entities/original-character.entity";

@Injectable()
export class OriginalCharactersService {
  constructor(
    @InjectRepository(OriginalCharacterEntity)
    private readonly ocs: Repository<OriginalCharacterEntity>,
    private readonly bunny: BunnyService,
  ) {}

  async create(
    dto: CreateOriginalCharacterDto,
  ): Promise<OriginalCharacterResponse> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException("Name is required");
    }

    const media = await this.verifyPortrait(dto.publicId, {
      width: dto.width,
      height: dto.height,
      blurHash: dto.blurHash,
    });

    const entity = this.ocs.create({
      name,
      age: dto.age?.trim() ?? "",
      likes: dto.likes?.trim() ?? "",
      dislikes: dto.dislikes?.trim() ?? "",
      background: dto.background?.trim() ?? "",
      additionalInfo: dto.additionalInfo?.trim() ?? "",
      ...media,
    });

    return toOriginalCharacterResponse(await this.ocs.save(entity));
  }

  async findAll(
    query: ListOriginalCharactersQueryDto,
  ): Promise<PaginatedOriginalCharactersResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.ocs.createQueryBuilder("oc");

    if (query.q?.trim()) {
      const q = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(oc.name) LIKE :q OR LOWER(oc.background) LIKE :q OR LOWER(oc.additionalInfo) LIKE :q)",
        { q },
      );
    }

    if (query.starred !== undefined) {
      qb.andWhere("oc.starred = :starred", { starred: query.starred });
    }

    qb.orderBy("oc.createdAt", "DESC").addOrderBy("oc.name", "ASC");
    // Board payload: skip long profile text; search still uses those columns.
    const { entities: rows, raw } = await qb
      .select([
        "oc.id",
        "oc.name",
        "oc.age",
        "oc.publicId",
        "oc.thumbnailUrl",
        "oc.mediaUrl",
        "oc.width",
        "oc.height",
        "oc.blurHash",
        "oc.starred",
        "oc.createdAt",
      ])
      .addSelect("COUNT(*) OVER()", "total_count")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities<{ total_count: string }>();
    const firstRow = raw[0];
    const total = firstRow
      ? Number(firstRow.total_count)
      : await qb.clone().skip(undefined).take(undefined).getCount();

    return {
      data: rows.map(toOriginalCharacterResponse),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
      },
    };
  }

  async findOne(id: string): Promise<OriginalCharacterResponse> {
    return toOriginalCharacterResponse(await this.findEntityOrFail(id));
  }

  async update(
    id: string,
    dto: UpdateOriginalCharacterDto,
  ): Promise<OriginalCharacterResponse> {
    const entity = await this.findEntityOrFail(id);

    if (dto.starred === true && !entity.starred) {
      const count = await this.ocs
        .createQueryBuilder("oc")
        .where("oc.starred = :starred", { starred: true })
        .getCount();
      if (count >= MAX_STARS_PER_CATEGORY) {
        throw new BadRequestException(
          `You can star a maximum of ${MAX_STARS_PER_CATEGORY} items in the oc category`,
        );
      }
    }
    if (dto.starred !== undefined) {
      entity.starred = dto.starred;
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException("Name is required");
      entity.name = name;
    }
    if (dto.age !== undefined) entity.age = dto.age.trim();
    if (dto.likes !== undefined) entity.likes = dto.likes.trim();
    if (dto.dislikes !== undefined) entity.dislikes = dto.dislikes.trim();
    if (dto.background !== undefined) {
      entity.background = dto.background.trim();
    }
    if (dto.additionalInfo !== undefined) {
      entity.additionalInfo = dto.additionalInfo.trim();
    }

    if (dto.publicId && dto.publicId !== entity.publicId) {
      const previousId = entity.publicId;
      const media = await this.verifyPortrait(dto.publicId, {
        width: dto.width,
        height: dto.height,
        blurHash: dto.blurHash,
      });
      Object.assign(entity, media);
      if (previousId) {
        await this.bunny.destroy(previousId, "image");
      }
    } else if (dto.width !== undefined || dto.height !== undefined) {
      const hasWidth = dto.width !== undefined;
      const hasHeight = dto.height !== undefined;
      if (hasWidth !== hasHeight) {
        throw new BadRequestException(
          "width and height must both be provided together",
        );
      }
      if (hasWidth) {
        entity.width = dto.width ?? null;
        entity.height = dto.height ?? null;
      }
    }

    return toOriginalCharacterResponse(await this.ocs.save(entity));
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findEntityOrFail(id);
    if (entity.publicId) {
      await this.bunny.destroy(entity.publicId, "image");
    }
    await this.ocs.remove(entity);
  }

  private async verifyPortrait(
    publicId: string,
    dims: { width?: number; height?: number; blurHash?: string },
  ) {
    const hasWidth = dims.width !== undefined && dims.width !== null;
    const hasHeight = dims.height !== undefined && dims.height !== null;
    if (hasWidth !== hasHeight) {
      throw new BadRequestException(
        "width and height must both be provided together",
      );
    }

    const blurHash =
      typeof dims.blurHash === "string" ? dims.blurHash.trim() : "";
    if (dims.blurHash !== undefined && blurHash.length === 0) {
      throw new BadRequestException("blurHash must not be empty");
    }

    const { urls } = await this.bunny.verifyAndDeriveUrls({
      publicId,
      resourceType: "image",
      mediaType: "image",
    });

    return {
      publicId,
      resourceType: "image",
      mediaUrl: urls.mediaUrl,
      thumbnailUrl: urls.thumbnailUrl,
      width: hasWidth ? Number(dims.width) : null,
      height: hasHeight ? Number(dims.height) : null,
      blurHash: blurHash.length > 0 ? blurHash : null,
    };
  }

  private async findEntityOrFail(
    id: string,
  ): Promise<OriginalCharacterEntity> {
    const entity = await this.ocs.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Original character not found: ${id}`);
    }
    return entity;
  }
}
