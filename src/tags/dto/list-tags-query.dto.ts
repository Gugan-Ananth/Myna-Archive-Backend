import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional } from "class-validator";
import { MEDIA_TYPES } from "../../common/media-type";
import {
  ARCHIVE_SECTIONS,
  type ArchiveSection,
} from "../../common/archive-section";
import { transformQueryBoolean } from "../../common/query-boolean";

export class ListTagsQueryDto {
  @IsOptional()
  @IsIn(MEDIA_TYPES)
  mediaType?: (typeof MEDIA_TYPES)[number];

  @IsOptional()
  @IsIn(ARCHIVE_SECTIONS)
  section?: ArchiveSection;

  /** true = image groups (2+ assets); false = single images. */
  @IsOptional()
  @Transform(transformQueryBoolean)
  @IsBoolean()
  imageGroup?: boolean;
}
