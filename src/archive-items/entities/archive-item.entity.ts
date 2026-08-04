import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { MediaType } from '../../common/media-type';

@Entity('archive_items')
export class ArchiveItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 300 })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  /** Decimal 0.0–10.0 stored as double precision. */
  @Column({ type: 'double precision' })
  rating!: number;

  @Column({ type: 'varchar', length: 16 })
  mediaType!: MediaType;

  @Column({ type: 'text' })
  thumbnailUrl!: string;

  @Column({ type: 'text' })
  mediaUrl!: string;

  /**
   * Provider asset id for destroy / re-derive URLs.
   * Image: Bunny Storage path (e.g. myna-archive/uuid.jpg).
   * Video: Bunny Stream video GUID.
   */
  @Column({ type: 'varchar', length: 512 })
  publicId!: string;

  /** Media resource kind (image | video). */
  @Column({ type: 'varchar', length: 16 })
  resourceType!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
