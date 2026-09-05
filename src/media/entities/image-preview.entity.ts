import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * One stored low-weight still per original Bunny Storage object.
 * Grid/list UIs use `previewUrl`; the original stays on the Archive Item
 * `mediaUrl` for the detail view.
 */
@Entity("image_previews")
export class ImagePreviewEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** Bunny Storage path of the original upload. */
  @Column({ type: "varchar", length: 512, unique: true })
  originalPublicId!: string;

  /** Bunny Storage path of the WebP preview object. */
  @Column({ type: "varchar", length: 512 })
  previewPublicId!: string;

  /** CDN URL for the preview object (no Optimizer query string). */
  @Column({ type: "text" })
  previewUrl!: string;

  @Column({ type: "int" })
  bytes!: number;

  @Column({ type: "int", nullable: true })
  width!: number | null;

  @Column({ type: "int", nullable: true })
  height!: number | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
