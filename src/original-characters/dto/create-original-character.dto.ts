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

export class CreateOriginalCharacterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name!: string;

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

  @IsString()
  @MinLength(1)
  publicId!: string;

  @IsIn(["image"])
  resourceType!: "image";

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
