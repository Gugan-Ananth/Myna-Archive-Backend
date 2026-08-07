import { Module } from "@nestjs/common";
import { BunnyService } from "./bunny.service";
import { MediaController } from "./media.controller";

@Module({
  controllers: [MediaController],
  providers: [BunnyService],
  exports: [BunnyService],
})
export class MediaModule {}
