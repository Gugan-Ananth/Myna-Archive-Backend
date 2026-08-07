import { Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class CreateCategoryFirstTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;
}

/**
 * Create a user category. Optionally include a first tag so the category
 * is immediately usable on an item.
 */
export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCategoryFirstTagDto)
  firstTag?: CreateCategoryFirstTagDto;
}
