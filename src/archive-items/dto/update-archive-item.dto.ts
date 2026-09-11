import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { MAX_STORY_BODY_CHARS } from "../../common/story-html";
import { CaptionSpecDto } from "./caption-spec.dto";
import { CreateMediaAssetDto } from "./media-asset.dto";
import {
  MAX_STORY_CHARACTERS,
  StoryCharacterInputDto,
} from "./story-character.dto";

export class UpdateArchiveItemDto {
  @IsOptional()
  @IsBoolean()
  starred?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  /** Optional author name for written stories. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  author?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_STORY_BODY_CHARS)
  bodyHtml?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  summary?: string;

  /** Replace caption layout options and source photo pointer. Omit to leave unchanged. */
  @IsOptional()
  @ValidateNested()
  @Type(() => CaptionSpecDto)
  captionSpec?: CaptionSpecDto;

  /**
   * Replace story media. Same convention as create: extra leading asset is
   * the optional cover; remaining assets bind to body `<img>` tags in order.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => CreateMediaAssetDto)
  assets?: CreateMediaAssetDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10)
  rating?: number;

  /**
   * Replace this chapter's named speakers. Omit to leave unchanged.
   * Send `[]` to clear. Portraits are not mixed into `assets`.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_STORY_CHARACTERS)
  @ValidateNested({ each: true })
  @Type(() => StoryCharacterInputDto)
  characters?: StoryCharacterInputDto[];
}
