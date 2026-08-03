import type { MediaType } from '../../common/media-type';
import type { ArchiveItemEntity } from '../entities/archive-item.entity';

/** Public Archive Item shape (frontend contract). */
export type ArchiveItemResponse = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  rating: number;
  mediaType: MediaType;
  thumbnailUrl: string;
  mediaUrl: string;
};

export type PaginatedArchiveItemsResponse = {
  data: ArchiveItemResponse[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export function toArchiveItemResponse(
  entity: ArchiveItemEntity,
): ArchiveItemResponse {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    tags: entity.tags,
    rating: entity.rating,
    mediaType: entity.mediaType,
    thumbnailUrl: entity.thumbnailUrl,
    mediaUrl: entity.mediaUrl,
  };
}
