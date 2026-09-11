import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { CaptionSpec } from "../../common/caption-spec";
import type { MediaType } from "../../common/media-type";
import type { ArchiveSection } from "../../common/archive-section";
import type { MediaAssetResponse } from "../dto/media-asset.dto";
import type { StoryCharacterResponse } from "../dto/story-character.dto";

@Index("archive_items_media_section_sort_idx", [
  "mediaType",
  "section",
  "rating",
  "name",
])
@Index("archive_items_images_single_sort_idx", ["rating", "name"], {
  where: `"mediaType" = 'image' AND "section" = 'images' AND "mediaAssetCount" <= 1`,
})
@Index("archive_items_images_group_sort_idx", ["rating", "name"], {
  where: `"mediaType" = 'image' AND "mediaAssetCount" >= 2`,
})
@Index("archive_items_tags_gin_idx", ["tags"], {
  synchronize: false,
} as import("typeorm").IndexOptions)
@Entity("archive_items")
export class ArchiveItemEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 300 })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  /** Optional author name for written stories; empty for other media types. */
  @Column({ type: "varchar", length: 300, default: "" })
  author!: string;

  /**
   * Written story body (HTML). Empty for image/video/comic items.
   * Inline <img> src values are Bunny CDN URLs bound in document order.
   */
  @Column({ type: "text", default: "" })
  bodyHtml!: string;

  /** Optional short blurb for story homepage cards. */
  @Column({ type: "varchar", length: 600, default: "" })
  summary!: string;

  /**
   * Layout options and source photo pointer for a Bondage caption.
   * Null for other media types. Story text lives in `bodyHtml`.
   */
  @Column({ type: "jsonb", nullable: true })
  captionSpec!: CaptionSpec | null;

  @Column({ type: "text", array: true, default: "{}" })
  tags!: string[];

  /** Decimal 0.0–10.0 stored as double precision. */
  @Column({ type: "double precision" })
  rating!: number;

  @Column({ type: "varchar", length: 16 })
  mediaType!: MediaType;

  /** Whether this item is one of the user's category stars. */
  @Column({ type: "boolean", default: false })
  starred!: boolean;

  /** Top-level archive section; legacy image rows belong to Images. */
  @Column({ type: "varchar", length: 32, default: "images" })
  section!: ArchiveSection;

  /**
   * Root story this chapter belongs to. Null when this row is the series
   * itself (chapter 1 / the work shown on the home Stories view).
   */
  @Column({ type: "uuid", nullable: true })
  seriesId!: string | null;

  /** 1-based chapter index within the series. Roots are chapter 1. */
  @Column({ type: "int", default: 1 })
  chapterNumber!: number;

  /**
   * Cover thumbnail (first media asset) — homepage grid.
   * Denormalized for list performance.
   */
  @Column({ type: "text" })
  thumbnailUrl!: string;

  /**
   * Cover full media URL (first media asset).
   * Denormalized for list performance.
   */
  @Column({ type: "text" })
  mediaUrl!: string;

  /** Pixel width of cover media; null when unknown. */
  @Column({ type: "int", nullable: true })
  width!: number | null;

  /** Pixel height of cover media; null when unknown. */
  @Column({ type: "int", nullable: true })
  height!: number | null;

  /** Compact BlurHash for cover LQIP; null when not provided. */
  @Column({ type: "varchar", length: 100, nullable: true })
  blurHash!: string | null;

  /**
   * Cover provider asset id (first media asset).
   * Image: Bunny Storage path. Video: Stream GUID.
   */
  @Column({ type: "varchar", length: 512 })
  publicId!: string;

  /** Cover media resource kind (image | video). */
  @Column({ type: "varchar", length: 16 })
  resourceType!: string;

  /**
   * Ordered media assets for this item.
   * - Single image / video: length 1
   * - Image group: 2–25 images (cover is index 0)
   * - Comic: 1–80 pages (cover is index 0)
   * Null on legacy rows — synthesized from cover fields in the response mapper.
   */
  @Column({ type: "jsonb", nullable: true })
  mediaAssets!: MediaAssetResponse[] | null;

  /**
   * Named speakers for a written story, each with an optional portrait.
   * Empty for other media types. Not mixed into `mediaAssets`.
   */
  @Column({ type: "jsonb", default: () => "'[]'" })
  characters!: StoryCharacterResponse[];

  /**
   * Number of ordered media assets. Kept as a stored generated column so list
   * filters do not need to parse the JSONB payload for every archive item.
   */
  @Column({
    type: "int",
    name: "mediaAssetCount",
    asExpression:
      'CASE WHEN "mediaAssets" IS NOT NULL AND jsonb_typeof("mediaAssets") = \'array\' THEN jsonb_array_length("mediaAssets") ELSE 0 END',
    generatedType: "STORED",
    insert: false,
    update: false,
  })
  mediaAssetCount!: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
