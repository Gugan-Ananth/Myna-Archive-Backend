import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

/** One category's tag order. */
export class ReorderCategoryTagsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  categorySlug!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  tagSlugs!: string[];
}

/**
 * Persist a new category and/or tag order (`sortOrder`).
 * Omitted slugs keep their relative order at the end.
 */
export class ReorderTaxonomyDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categorySlugs?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderCategoryTagsDto)
  tags?: ReorderCategoryTagsDto[];
}
