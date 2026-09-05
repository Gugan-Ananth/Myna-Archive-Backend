import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BunnyService } from "./bunny.service";
import { ImagePreviewEntity } from "./entities/image-preview.entity";
import { ImagePreviewService } from "./image-preview.service";
import { MediaController } from "./media.controller";

@Module({
  imports: [TypeOrmModule.forFeature([ImagePreviewEntity])],
  controllers: [MediaController],
  providers: [BunnyService, ImagePreviewService],
  exports: [BunnyService, ImagePreviewService],
})
export class MediaModule {}
