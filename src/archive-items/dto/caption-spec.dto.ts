import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import {
  CAPTION_FONTS,
  CAPTION_MAX_HEIGHT,
  CAPTION_MAX_FONT_SIZE,
  CAPTION_MIN_FONT_SIZE,
  CAPTION_MIN_HEIGHT,
  CAPTION_TEMPLATES,
} from "../../common/caption-spec";

/** Layout options for a Bondage caption. Story text lives in `bodyHtml`. */
export class CaptionSpecDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1)
  version?: 1;

  @IsIn(CAPTION_TEMPLATES)
  template!: (typeof CAPTION_TEMPLATES)[number];

  @Type(() => Number)
  @IsInt()
  @Min(640)
  @Max(1200)
  width!: number;

  @Type(() => Number)
  @IsInt()
  @Min(CAPTION_MIN_HEIGHT)
  @Max(CAPTION_MAX_HEIGHT)
  height!: number;

  @IsIn(CAPTION_FONTS)
  fontFamily!: (typeof CAPTION_FONTS)[number];

  @Type(() => Number)
  @IsNumber()
  @Min(CAPTION_MIN_FONT_SIZE)
  @Max(CAPTION_MAX_FONT_SIZE)
  fontSize!: number;

  @Type(() => Number)
  @IsInt()
  @Min(16)
  @Max(96)
  padding!: number;

  @IsString()
  background!: string;

  @IsString()
  textColor!: string;

  @IsOptional()
  @IsString()
  panelColor?: string;

  /** Bunny Storage path of the original photo. Not a gallery media asset. */
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  sourcePublicId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20_000)
  sourceWidth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20_000)
  sourceHeight?: number;
}
