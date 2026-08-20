import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateTaxonomyTagDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label?: string;

  /** Destination category slug when moving the tag. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  categorySlug?: string;
}
