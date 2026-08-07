import type { MediaType } from "../../common/media-type";
import type { ArchiveItemEntity } from "../entities/archive-item.entity";
import type { MediaAssetResponse } from "./media-asset.dto";

/** Public Archive Item shape (cover + ordered media assets for groups). */
export type ArchiveItemResponse = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  rating: number;
  mediaType: MediaType;
  /** Cover (first asset) — homepage grid. */
  thumbnailUrl: string;
  mediaUrl: string;
  width: number | null;
  height: number | null;
  blurHash: string | null;
  /**
   * Ordered media assets. Length 1 for single image/video;
   * 2–10 for an image group. Cover is always index 0.
   */
  mediaAssets: MediaAssetResponse[];
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

/** Build mediaAssets from stored JSON or legacy cover columns. */
export function resolveMediaAssets(
  entity: ArchiveItemEntity,
): MediaAssetResponse[] {
  if (entity.mediaAssets && entity.mediaAssets.length > 0) {
    return entity.mediaAssets;
  }

  return [
    {
      publicId: entity.publicId,
      resourceType: entity.resourceType === "video" ? "video" : "image",
      mediaUrl: entity.mediaUrl,
      thumbnailUrl: entity.thumbnailUrl,
      width: entity.width ?? null,
      height: entity.height ?? null,
      blurHash: entity.blurHash ?? null,
    },
  ];
}

export function toArchiveItemResponse(
  entity: ArchiveItemEntity,
): ArchiveItemResponse {
  const mediaAssets = resolveMediaAssets(entity);
  const cover = mediaAssets[0];

  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    tags: entity.tags,
    rating: entity.rating,
    mediaType: entity.mediaType,
    thumbnailUrl: cover?.thumbnailUrl ?? entity.thumbnailUrl,
    mediaUrl: cover?.mediaUrl ?? entity.mediaUrl,
    width: cover?.width ?? entity.width ?? null,
    height: cover?.height ?? entity.height ?? null,
    blurHash: cover?.blurHash ?? entity.blurHash ?? null,
    mediaAssets,
  };
}
