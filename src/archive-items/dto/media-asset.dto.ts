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

/** Max images in one image-group Archive Item (ADR 0009). */
export const MAX_IMAGE_ASSETS = 10;

/** One uploaded media file within an Archive Item (cover or slide). */
export type MediaAssetResponse = {
  publicId: string;
  resourceType: "image" | "video";
  mediaUrl: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  blurHash: string | null;
};

/** Client payload for one asset on create (URLs derived by Nest after verify). */
export class CreateMediaAssetDto {
  @IsString()
  @MinLength(1)
  publicId!: string;

  @IsIn(["image", "video"])
  resourceType!: "image" | "video";

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
