import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { MediaType } from "../../common/media-type";
import type { MediaAssetResponse } from "../dto/media-asset.dto";

@Entity("archive_items")
export class ArchiveItemEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 300 })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "text", array: true, default: "{}" })
  tags!: string[];

  /** Decimal 0.0–10.0 stored as double precision. */
  @Column({ type: "double precision" })
  rating!: number;

  @Column({ type: "varchar", length: 16 })
  mediaType!: MediaType;

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
   * - Image group: 2–10 images (cover is index 0)
   * Null on legacy rows — synthesized from cover fields in the response mapper.
   */
  @Column({ type: "jsonb", nullable: true })
  mediaAssets!: MediaAssetResponse[] | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
