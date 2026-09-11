import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsDefined,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { MEDIA_TYPES } from "../../common/media-type";
import {
  ARCHIVE_SECTIONS,
  type ArchiveSection,
} from "../../common/archive-section";
import { MAX_STORY_BODY_CHARS } from "../../common/story-html";
import { CaptionSpecDto } from "./caption-spec.dto";
import { CreateMediaAssetDto, MAX_COMIC_ASSETS } from "./media-asset.dto";
import {
  MAX_STORY_CHARACTERS,
  StoryCharacterInputDto,
} from "./story-character.dto";

/**
 * Create Archive Item.
 *
 * Prefer `assets` (1–25 images, 1–80 comic pages, or 1 video). Legacy
 * single-asset fields (`publicId` / `resourceType` / dims / blurHash)
 * remain supported when `assets` is omitted.
 */
export class CreateArchiveItemDto {
  /**
   * Ordered media assets. When provided:
   * - image: 1–25, all resourceType image
   * - comic: 1–80, all resourceType image
   * - video: exactly 1, resourceType video
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_COMIC_ASSETS)
  @ValidateNested({ each: true })
  @Type(() => CreateMediaAssetDto)
  assets?: CreateMediaAssetDto[];

  /** Legacy single-asset: required when `assets` is omitted. */
  @ValidateIf(
    (o: CreateArchiveItemDto) =>
      o.mediaType !== "story" && !o.assets?.length,
  )
  @IsString()
  @MinLength(1)
  publicId?: string;

  @ValidateIf(
    (o: CreateArchiveItemDto) =>
      o.mediaType !== "story" && !o.assets?.length,
  )
  @IsIn(["image", "video"])
  resourceType?: "image" | "video";

  @IsIn(MEDIA_TYPES)
  mediaType!: (typeof MEDIA_TYPES)[number];

  @IsOptional()
  @IsIn(ARCHIVE_SECTIONS)
  section?: ArchiveSection;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  tags!: string[];

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  /** Optional author name for written stories. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  author?: string;

  /** Written story HTML. Inline images are rewritten to CDN URLs on save. */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_STORY_BODY_CHARS)
  bodyHtml?: string;

  /** Optional short story blurb for the homepage card. */
  @IsOptional()
  @IsString()
  @MaxLength(600)
  summary?: string;

  /**
   * Layout options and source photo pointer for a Bondage caption.
   * Required when `mediaType` is `caption`. Story text is `bodyHtml`.
   */
  @ValidateIf((o: CreateArchiveItemDto) => o.mediaType === "caption")
  @IsDefined()
  @ValidateNested()
  @Type(() => CaptionSpecDto)
  captionSpec?: CaptionSpecDto;

  /** Existing series root to attach this chapter to. */
  @IsOptional()
  @IsUUID()
  seriesId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  chapterNumber?: number;

  /**
   * Named speakers for this chapter. Portraits are verified like other
   * images and stored separately from cover/body `assets`.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_STORY_CHARACTERS)
  @ValidateNested({ each: true })
  @Type(() => StoryCharacterInputDto)
  characters?: StoryCharacterInputDto[];

  /** Legacy cover dims — ignored when `assets` carries per-slide dims. */
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
