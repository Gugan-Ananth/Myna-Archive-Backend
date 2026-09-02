import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Index("original_characters_list_sort_idx", ["createdAt", "name"])
@Index("original_characters_starred_sort_idx", ["createdAt", "name"], {
  where: `"starred" = true`,
})
@Entity("original_characters")
export class OriginalCharacterEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 300 })
  name!: string;

  /** Free-text age ("19", "ageless", …). Empty when omitted. */
  @Column({ type: "varchar", length: 40, default: "" })
  age!: string;

  @Column({ type: "text", default: "" })
  likes!: string;

  @Column({ type: "text", default: "" })
  dislikes!: string;

  @Column({ type: "text", default: "" })
  background!: string;

  @Column({ type: "text", default: "" })
  additionalInfo!: string;

  @Column({ type: "varchar", length: 512 })
  publicId!: string;

  @Column({ type: "varchar", length: 16, default: "image" })
  resourceType!: string;

  /** Whether this OC is one of the ten category stars. */
  @Column({ type: "boolean", default: false })
  starred!: boolean;

  @Column({ type: "text" })
  mediaUrl!: string;

  @Column({ type: "text" })
  thumbnailUrl!: string;

  @Column({ type: "int", nullable: true })
  width!: number | null;

  @Column({ type: "int", nullable: true })
  height!: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  blurHash!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
