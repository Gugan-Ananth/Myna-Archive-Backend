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
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { CreateMediaAssetDto, MAX_IMAGE_ASSETS } from "./media-asset.dto";

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
  @ArrayMaxSize(MAX_IMAGE_ASSETS)
  @ValidateNested({ each: true })
  @Type(() => CreateMediaAssetDto)
  assets?: CreateMediaAssetDto[];

  /** Legacy single-asset: required when `assets` is omitted. */
  @ValidateIf((o: CreateArchiveItemDto) => !o.assets?.length)
  @IsString()
  @MinLength(1)
  publicId?: string;

  @ValidateIf((o: CreateArchiveItemDto) => !o.assets?.length)
  @IsIn(["image", "video"])
  resourceType?: "image" | "video";

  @IsIn(["image", "video"])
  mediaType!: "image" | "video";

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
