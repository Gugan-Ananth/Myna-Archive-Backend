import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
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
import { CreateMediaAssetDto } from "./media-asset.dto";

/**
 * Create Archive Item.
 *
 * Prefer `assets` (1–10 images, or 1 video). Legacy single-asset fields
 * (`publicId` / `resourceType` / dims / blurHash) remain supported when
 * `assets` is omitted.
 */
export class CreateArchiveItemDto {
  /**
   * Ordered media assets. When provided:
   * - image: 1–10, all resourceType image
   * - video: exactly 1, resourceType video
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
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

  @IsIn(["image", "video", "story"])
  mediaType!: "image" | "video" | "story";

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

  /** Written story HTML. Inline images are rewritten to CDN URLs on save. */
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  bodyHtml?: string;

  /** Optional short story blurb for the homepage card. */
  @IsOptional()
  @IsString()
  @MaxLength(600)
  summary?: string;

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
