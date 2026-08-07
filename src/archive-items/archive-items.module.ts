import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MediaModule } from "../media/media.module";
import { TaxonomyModule } from "../taxonomy/taxonomy.module";
import { ArchiveItemsController } from "./archive-items.controller";
import { ArchiveItemsService } from "./archive-items.service";
import { ArchiveItemEntity } from "./entities/archive-item.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([ArchiveItemEntity]),
    MediaModule,
    TaxonomyModule,
  ],
  controllers: [ArchiveItemsController],
  providers: [ArchiveItemsService],
  exports: [ArchiveItemsService],
})
export class ArchiveItemsModule {}
