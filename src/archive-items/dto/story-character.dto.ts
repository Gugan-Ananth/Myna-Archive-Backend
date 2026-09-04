import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

/** Max named speakers stored on one story chapter. */
export const MAX_STORY_CHARACTERS = 40;

/** Max length of a story character name. */
export const MAX_STORY_CHARACTER_NAME = 80;

/**
 * Named speaker in a written story, with an optional portrait used in the
 * chapter reader chat layout. Portraits are NOT mixed into `mediaAssets`
 * (that array is cover + inline body images only).
 */
export type StoryCharacterResponse = {
  name: string;
  publicId: string | null;
  mediaUrl: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  blurHash: string | null;
};

/** Client payload for one story character on create/update. */
export class StoryCharacterInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_STORY_CHARACTER_NAME)
  name!: string;

  /** Bunny Storage path. Omit for the default (initials) portrait. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  publicId?: string;

  @IsOptional()
  @IsIn(["image"])
  resourceType?: "image";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  blurHash?: string;
}
