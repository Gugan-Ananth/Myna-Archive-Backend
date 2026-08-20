import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional } from "class-validator";

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return undefined;
}

export class ListTagsQueryDto {
  @IsOptional()
  @IsIn(["image", "video", "story"])
  mediaType?: "image" | "video" | "story";

  /** true = image groups (2+ assets); false = single images. */
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  imageGroup?: boolean;
}
