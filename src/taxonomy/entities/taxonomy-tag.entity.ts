import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { TagCategoryEntity } from "./tag-category.entity";

@Entity("taxonomy_tags")
@Unique(["categoryId", "slug"])
@Index(["slug"])
export class TaxonomyTagEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  categoryId!: string;

  @ManyToOne(() => TagCategoryEntity, (category) => category.tags, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "categoryId" })
  category!: TagCategoryEntity;

  @Column({ type: "varchar", length: 80 })
  slug!: string;

  @Column({ type: "varchar", length: 120 })
  label!: string;

  @Column({ type: "boolean", default: false })
  builtIn!: boolean;

  @Column({ type: "int", default: 100 })
  sortOrder!: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
