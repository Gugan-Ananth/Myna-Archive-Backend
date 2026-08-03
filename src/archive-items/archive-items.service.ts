import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeTags } from '../common/normalize-tags';
import { CloudinaryService } from '../media/cloudinary.service';
import {
  toArchiveItemResponse,
  type ArchiveItemResponse,
  type PaginatedArchiveItemsResponse,
} from './dto/archive-item-response.dto';
import { CreateArchiveItemDto } from './dto/create-archive-item.dto';
import { ListArchiveItemsQueryDto } from './dto/list-archive-items-query.dto';
import { UpdateArchiveItemDto } from './dto/update-archive-item.dto';
import { ArchiveItemEntity } from './entities/archive-item.entity';

@Injectable()
export class ArchiveItemsService {
  private readonly logger = new Logger(ArchiveItemsService.name);

  constructor(
    @InjectRepository(ArchiveItemEntity)
    private readonly archiveItems: Repository<ArchiveItemEntity>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreateArchiveItemDto): Promise<ArchiveItemResponse> {
    const tags = normalizeTags(dto.tags);
    if (tags.length === 0) {
      throw new BadRequestException(
        'At least one non-empty tag is required after normalization',
      );
    }

    const { urls } = await this.cloudinary.verifyAndDeriveUrls({
      publicId: dto.publicId,
      resourceType: dto.resourceType,
      mediaType: dto.mediaType,
    });

    const entity = this.archiveItems.create({
      name: dto.name.trim(),
      description: dto.description?.trim() ?? '',
      tags,
      rating: dto.rating,
      mediaType: dto.mediaType,
      thumbnailUrl: urls.thumbnailUrl,
      mediaUrl: urls.mediaUrl,
      publicId: dto.publicId,
      resourceType: dto.resourceType,
    });

    const saved = await this.archiveItems.save(entity);
    return toArchiveItemResponse(saved);
  }

  async findAll(
    query: ListArchiveItemsQueryDto,
  ): Promise<PaginatedArchiveItemsResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.archiveItems.createQueryBuilder('item');

    if (query.mediaType) {
      qb.andWhere('item.mediaType = :mediaType', {
        mediaType: query.mediaType,
      });
    }

    if (query.tag && query.tag.length > 0) {
      const tags = normalizeTags(query.tag);
      if (tags.length > 0) {
        // Postgres array containment: item must include every selected tag (AND).
        qb.andWhere('item.tags @> :filterTags', { filterTags: tags });
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

    qb.orderBy('item.rating', 'DESC').addOrderBy('item.name', 'ASC');

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
          'At least one non-empty tag is required after normalization',
        );
      }
      entity.tags = tags;
    }

    const saved = await this.archiveItems.save(entity);
    return toArchiveItemResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findEntityOrFail(id);
    const resourceType =
      entity.resourceType === 'video' ? 'video' : 'image';

    await this.cloudinary.destroy(entity.publicId, resourceType);
    await this.archiveItems.remove(entity);
    this.logger.log(`Deleted archive item ${id}`);
  }

  private async findEntityOrFail(id: string): Promise<ArchiveItemEntity> {
    const entity = await this.archiveItems.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Archive item not found: ${id}`);
    }
    return entity;
  }
}
