import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ArchiveItemEntity } from "../archive-items/entities/archive-item.entity";
import { TagCategoryEntity } from "./entities/tag-category.entity";
import { TaxonomyTagEntity } from "./entities/taxonomy-tag.entity";
import { TaxonomyController } from "./taxonomy.controller";
import { TaxonomyService } from "./taxonomy.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TagCategoryEntity,
      TaxonomyTagEntity,
      ArchiveItemEntity,
    ]),
  ],
  controllers: [TaxonomyController],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
