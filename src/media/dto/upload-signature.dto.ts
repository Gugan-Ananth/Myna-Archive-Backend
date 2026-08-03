import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UploadSignatureDto {
  @IsIn(['image', 'video'])
  mediaType!: 'image' | 'video';

  @IsString()
  @MinLength(1)
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  byteSize!: number;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export type UploadSignatureResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  resourceType: 'image' | 'video';
  chunkSize: number;
  maxBytes: number;
};
