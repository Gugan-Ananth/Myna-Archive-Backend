import type { CaptionSpec } from "../../common/caption-spec";
import type { MediaType } from "../../common/media-type";
import type { ArchiveSection } from "../../common/archive-section";
import type { ArchiveItemEntity } from "../entities/archive-item.entity";
import type { MediaAssetResponse } from "./media-asset.dto";
import type { StoryCharacterResponse } from "./story-character.dto";

/** Public Archive Item shape (cover + ordered media assets for groups). */
export type ArchiveItemResponse = {
  id: string;
  name: string;
  description: string;
  /** Optional author name for written stories. */
  author: string;
  /** Written story HTML; empty for image/video/comic. Caption story is plain text. */
  bodyHtml: string;
  /** Optional short story blurb for homepage cards. */
  summary: string;
  /** Layout options for a Bondage caption; null for other media types. */
  captionSpec: CaptionSpec | null;
  tags: string[];
  rating: number;
  mediaType: MediaType;
  starred: boolean;
  section: ArchiveSection;
  /** Root story id when this row is a later chapter; null for the series root. */
  seriesId: string | null;
  /** 1-based chapter index. Roots are chapter 1. */
  chapterNumber: number;
  /** Chapters in the series (root + continuations). 1 for a lone story. */
  chapterCount: number;
  /**
   * Mean of every chapter rating in the series. Same as `rating` for a
   * single-chapter story and for non-stories.
   */
  seriesRating: number;
  /** Cover (first asset) — homepage grid. */
  thumbnailUrl: string;
  mediaUrl: string;
  width: number | null;
  height: number | null;
  blurHash: string | null;
  /**
   * Ordered media assets. Length 1 for single image/video/caption;
   * 2–25 for an image group; 1–80 for a comic. Cover is always index 0.
   */
  mediaAssets: MediaAssetResponse[];
  /**
   * Named speakers for a written story (empty for other media types).
   * Optional portraits are stored here, not in `mediaAssets`.
   */
  characters: StoryCharacterResponse[];
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

  if (entity.mediaType === "story" && !entity.publicId) {
    return [];
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

export function resolveStoryCharacters(
  entity: ArchiveItemEntity,
): StoryCharacterResponse[] {
  const rows = entity.characters;
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.map((row) => ({
    name: typeof row.name === "string" ? row.name : "",
    publicId: row.publicId ?? null,
    mediaUrl: row.mediaUrl ?? "",
    thumbnailUrl: row.thumbnailUrl ?? "",
    width: row.width ?? null,
    height: row.height ?? null,
    blurHash: row.blurHash ?? null,
  }));
}

export function toArchiveItemResponse(
  entity: ArchiveItemEntity,
  extras?: { chapterCount?: number; seriesRating?: number },
): ArchiveItemResponse {
  const mediaAssets = resolveMediaAssets(entity);
  const cover = mediaAssets[0];

  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    author: entity.author ?? "",
    bodyHtml: entity.bodyHtml ?? "",
    summary: entity.summary ?? "",
    captionSpec: entity.captionSpec ?? null,
    tags: entity.tags,
    rating: entity.rating,
    mediaType: entity.mediaType,
    starred: entity.starred ?? false,
    section: entity.section ?? "images",
    seriesId: entity.seriesId ?? null,
    chapterNumber: entity.chapterNumber ?? 1,
    chapterCount: extras?.chapterCount ?? 1,
    seriesRating: extras?.seriesRating ?? entity.rating,
    thumbnailUrl: cover?.thumbnailUrl ?? entity.thumbnailUrl,
    mediaUrl: cover?.mediaUrl ?? entity.mediaUrl,
    width: cover?.width ?? entity.width ?? null,
    height: cover?.height ?? entity.height ?? null,
    blurHash: cover?.blurHash ?? entity.blurHash ?? null,
    mediaAssets,
    characters: resolveStoryCharacters(entity),
  };
}
