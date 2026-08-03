import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { v2 as cloudinary, type ConfigOptions } from 'cloudinary';
import {
  formatAllowedForMediaType,
  type MediaType,
  mimeMatchesMediaType,
} from '../common/media-type';
import type {
  UploadSignatureDto,
  UploadSignatureResponse,
} from './dto/upload-signature.dto';

export type CloudinaryResourceInfo = {
  publicId: string;
  resourceType: 'image' | 'video';
  bytes: number;
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
};

export type DerivedMediaUrls = {
  mediaUrl: string;
  thumbnailUrl: string;
};

@Injectable()
export class CloudinaryService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const options: ConfigOptions = {
      cloud_name: this.config.getOrThrow<string>('cloudinary.cloudName'),
      api_key: this.config.getOrThrow<string>('cloudinary.apiKey'),
      api_secret: this.config.getOrThrow<string>('cloudinary.apiSecret'),
      secure: true,
    };
    cloudinary.config(options);
    this.configured = true;
  }

  async onApplicationBootstrap(): Promise<void> {
    const ok = await this.ping();
    if (ok) {
      this.logger.log('Cloudinary API accessible');
    } else {
      this.logger.warn(
        'Cloudinary API not reachable — check credentials and network',
      );
    }
  }

  async ping(): Promise<boolean> {
    if (!this.configured) {
      return false;
    }
    try {
      const result = await cloudinary.api.ping();
      return result?.status === 'ok';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Cloudinary ping failed: ${message}`);
      return false;
    }
  }

  getFolder(): string {
    return this.config.get<string>('cloudinary.folder') ?? 'myna-archive';
  }

  createUploadSignature(dto: UploadSignatureDto): UploadSignatureResponse {
    const { mediaType, mimeType, byteSize } = dto;

    if (!mimeMatchesMediaType(mimeType, mediaType)) {
      throw new BadRequestException(
        `MIME type "${mimeType}" is not allowed for mediaType "${mediaType}"`,
      );
    }

    const maxBytes =
      mediaType === 'image'
        ? this.config.getOrThrow<number>('upload.maxImageBytes')
        : this.config.getOrThrow<number>('upload.maxVideoBytes');

    if (byteSize > maxBytes) {
      throw new BadRequestException(
        `File size ${byteSize} exceeds max ${maxBytes} bytes for ${mediaType}`,
      );
    }

    const folder = this.getFolder();
    // Asset id only — Cloudinary stores final public_id as `${folder}/${publicId}`.
    const publicId = randomUUID();
    const timestamp = Math.round(Date.now() / 1000);
    const apiSecret = this.config.getOrThrow<string>('cloudinary.apiSecret');

    // Parameters sent with the upload (except file, api_key, resource_type, cloud_name) must be signed.
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
        public_id: publicId,
      },
      apiSecret,
    );

    return {
      cloudName: this.config.getOrThrow<string>('cloudinary.cloudName'),
      apiKey: this.config.getOrThrow<string>('cloudinary.apiKey'),
      timestamp,
      signature,
      folder,
      publicId,
      resourceType: mediaType,
      chunkSize: this.config.getOrThrow<number>('upload.chunkBytes'),
      maxBytes,
    };
  }

  async getResource(
    publicId: string,
    resourceType: 'image' | 'video',
  ): Promise<CloudinaryResourceInfo> {
    try {
      const resource = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });

      return {
        publicId: resource.public_id as string,
        resourceType,
        bytes: Number(resource.bytes ?? 0),
        format:
          typeof resource.format === 'string' ? resource.format : undefined,
        width:
          typeof resource.width === 'number' ? resource.width : undefined,
        height:
          typeof resource.height === 'number' ? resource.height : undefined,
        duration:
          typeof resource.duration === 'number'
            ? resource.duration
            : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('not found') || message.includes('404')) {
        throw new NotFoundException(
          `Cloudinary asset not found: ${publicId} (${resourceType})`,
        );
      }
      this.logger.warn(`Cloudinary resource fetch failed: ${message}`);
      throw new BadRequestException(
        `Unable to verify Cloudinary asset: ${publicId}`,
      );
    }
  }

  /**
   * Verify asset exists, type/size/format match product rules, return derived URLs.
   */
  async verifyAndDeriveUrls(params: {
    publicId: string;
    resourceType: 'image' | 'video';
    mediaType: MediaType;
  }): Promise<{ resource: CloudinaryResourceInfo; urls: DerivedMediaUrls }> {
    const { publicId, resourceType, mediaType } = params;

    if (resourceType !== mediaType) {
      throw new BadRequestException(
        `resourceType "${resourceType}" must match mediaType "${mediaType}"`,
      );
    }

    const resource = await this.getResource(publicId, resourceType);

    const maxBytes =
      mediaType === 'image'
        ? this.config.getOrThrow<number>('upload.maxImageBytes')
        : this.config.getOrThrow<number>('upload.maxVideoBytes');

    if (resource.bytes > maxBytes) {
      throw new BadRequestException(
        `Uploaded asset size ${resource.bytes} exceeds max ${maxBytes} for ${mediaType}`,
      );
    }

    if (!formatAllowedForMediaType(resource.format, mediaType)) {
      throw new BadRequestException(
        `Format "${resource.format ?? 'unknown'}" is not allowed for ${mediaType}`,
      );
    }

    const urls = this.buildUrls(publicId, mediaType);
    return { resource, urls };
  }

  buildUrls(publicId: string, mediaType: MediaType): DerivedMediaUrls {
    if (mediaType === 'image') {
      const imageTransform =
        this.config.get<string>('cloudinary.imageTransform') ?? 'q_auto:best';
      const thumbTransform =
        this.config.get<string>('cloudinary.thumbTransform') ??
        'c_fill,w_480,h_270,q_auto:eco';

      return {
        mediaUrl: cloudinary.url(publicId, {
          resource_type: 'image',
          secure: true,
          raw_transformation: imageTransform,
        }),
        thumbnailUrl: cloudinary.url(publicId, {
          resource_type: 'image',
          secure: true,
          raw_transformation: thumbTransform,
        }),
      };
    }

    const posterTransform =
      this.config.get<string>('cloudinary.videoPosterTransform') ??
      'so_0,w_480,h_270,c_fill,q_auto:eco';

    return {
      mediaUrl: cloudinary.url(publicId, {
        resource_type: 'video',
        secure: true,
        format: 'mp4',
      }),
      thumbnailUrl: cloudinary.url(publicId, {
        resource_type: 'video',
        secure: true,
        format: 'jpg',
        raw_transformation: posterTransform,
      }),
    };
  }

  async destroy(
    publicId: string,
    resourceType: 'image' | 'video',
  ): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Best-effort: log and continue so DB delete is not blocked by a missing asset.
      this.logger.warn(
        `Cloudinary destroy failed for ${publicId} (${resourceType}): ${message}`,
      );
    }
  }

  get client(): typeof cloudinary {
    return cloudinary;
  }
}
