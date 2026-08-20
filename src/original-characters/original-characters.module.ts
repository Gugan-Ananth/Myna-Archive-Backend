import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MediaModule } from "../media/media.module";
import { OriginalCharactersController } from "./original-characters.controller";
import { OriginalCharactersService } from "./original-characters.service";
import { OriginalCharacterEntity } from "./entities/original-character.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([OriginalCharacterEntity]),
    MediaModule,
  ],
  controllers: [OriginalCharactersController],
  providers: [OriginalCharactersService],
  exports: [OriginalCharactersService],
})
export class OriginalCharactersModule {}
