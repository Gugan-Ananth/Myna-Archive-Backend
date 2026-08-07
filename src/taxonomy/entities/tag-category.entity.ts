import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { TaxonomyTagEntity } from "./taxonomy-tag.entity";

@Entity("tag_categories")
export class TagCategoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 80, unique: true })
  slug!: string;

  @Column({ type: "varchar", length: 120 })
  label!: string;

  @Column({ type: "boolean", default: false })
  builtIn!: boolean;

  /** Lower sorts first among seed categories. */
  @Column({ type: "int", default: 100 })
  sortOrder!: number;

  @OneToMany(() => TaxonomyTagEntity, (tag) => tag.category, {
    cascade: true,
  })
  tags!: TaxonomyTagEntity[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
