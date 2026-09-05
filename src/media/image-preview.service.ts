import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BunnyService } from "./bunny.service";
import { ImagePreviewEntity } from "./entities/image-preview.entity";
import { encodeImagePreview, MAX_PREVIEW_BYTES } from "./preview-encode";
import { previewPublicIdFor } from "./preview-public-id";

export type ImagePreviewResult = {
  previewPublicId: string;
  previewUrl: string;
  bytes: number;
  width: number | null;
  height: number | null;
};

@Injectable()
export class ImagePreviewService {
  private readonly logger = new Logger(ImagePreviewService.name);

  constructor(
    @InjectRepository(ImagePreviewEntity)
    private readonly previews: Repository<ImagePreviewEntity>,
    private readonly bunny: BunnyService,
  ) {}

  /**
   * Return a stored <1 MB WebP for this original, creating it when missing.
   */
  async ensurePreview(originalPublicId: string): Promise<ImagePreviewResult> {
    const existing = await this.previews.findOne({
      where: { originalPublicId },
    });
    if (existing && existing.bytes > 0 && existing.bytes <= MAX_PREVIEW_BYTES) {
      return this.toResult(existing);
    }

    const original = await this.bunny.downloadImage(originalPublicId);
    const encoded = await encodeImagePreview(original);
    const previewPublicId = previewPublicIdFor(originalPublicId);
    await this.bunny.uploadImage(
      previewPublicId,
      encoded.buffer,
      "image/webp",
    );

    const previewUrl = this.bunny.cdnUrlFor(previewPublicId);
    const row =
      existing ??
      this.previews.create({
        originalPublicId,
        previewPublicId,
        previewUrl,
        bytes: encoded.bytes,
        width: encoded.width,
        height: encoded.height,
      });
    row.previewPublicId = previewPublicId;
    row.previewUrl = previewUrl;
    row.bytes = encoded.bytes;
    row.width = encoded.width;
    row.height = encoded.height;
    const saved = await this.previews.save(row);
    this.logger.log(
      `Stored image preview ${previewPublicId} (${saved.bytes} bytes)`,
    );
    return this.toResult(saved);
  }

  /** Best-effort: generate a preview, otherwise keep the existing thumbnail URL. */
  async thumbnailUrlFor(
    originalPublicId: string,
    fallbackUrl: string,
  ): Promise<string> {
    try {
      const preview = await this.ensurePreview(originalPublicId);
      return preview.previewUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Image preview failed for ${originalPublicId}: ${message}`,
      );
      return fallbackUrl;
    }
  }

  async destroyForOriginal(originalPublicId: string): Promise<void> {
    const existing = await this.previews.findOne({
      where: { originalPublicId },
    });
    if (!existing) return;
    await this.previews.remove(existing);
  }

  private toResult(row: ImagePreviewEntity): ImagePreviewResult {
    return {
      previewPublicId: row.previewPublicId,
      previewUrl: row.previewUrl,
      bytes: row.bytes,
      width: row.width,
      height: row.height,
    };
  }
}
