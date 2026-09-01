import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class UpdateOriginalCharacterDto {
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
  @MaxLength(40)
  age?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  likes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  dislikes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  background?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  additionalInfo?: string;

  /** Replace portrait. Must be sent with resourceType "image". */
  @IsOptional()
  @IsString()
  @MinLength(1)
  publicId?: string;

  @ValidateIf((o: UpdateOriginalCharacterDto) => Boolean(o.publicId))
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
