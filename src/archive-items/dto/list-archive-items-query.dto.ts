import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

function toScalarString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map(toScalarString).filter((s) => s.length > 0);
  }
  const single = toScalarString(value);
  return single.length > 0 ? [single] : undefined;
}

export class ListArchiveItemsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  /** One or more tags (AND). Supports `?tag=a&tag=b`. */
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  tag?: string[];

  @IsOptional()
  @IsIn(["image", "video"])
  mediaType?: "image" | "video";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
