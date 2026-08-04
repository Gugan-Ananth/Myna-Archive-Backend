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

/**
 * Credentials for direct browser → Bunny upload.
 *
 * - **image**: Edge Storage PUT (`uploadMethod: "PUT"`)
 * - **video**: Stream TUS resumable upload (`uploadMethod: "TUS"`)
 */
export type UploadSignatureResponse = {
  provider: 'bunny';
  mediaType: 'image' | 'video';
  resourceType: 'image' | 'video';
  /** Storage path (image) or Stream video GUID (video). Use as create `publicId`. */
  publicId: string;
  uploadMethod: 'PUT' | 'TUS';
  chunkSize: number;
  maxBytes: number;

  // --- Image (Edge Storage) ---
  /** Full PUT URL including zone + path. */
  uploadUrl?: string;
  /** Storage zone AccessKey for the AccessKey header (single-user v1). */
  accessKey?: string;
  headers?: Record<string, string>;

  // --- Video (Stream TUS) ---
  tusEndpoint?: string;
  libraryId?: string;
  videoId?: string;
  /** UNIX seconds when the TUS signature expires. */
  expirationTime?: number;
  /** SHA256(libraryId + apiKey + expirationTime + videoId). */
  signature?: string;
};
