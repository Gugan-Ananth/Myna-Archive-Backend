import { IsString, MaxLength, MinLength } from "class-validator";

/** Add a tag under an existing category (e.g. Bondage → Others). */
export class CreateTaxonomyTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;
}
