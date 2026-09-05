import sharp from "sharp";

/** Hard cap for a stored image preview file. */
export const MAX_PREVIEW_BYTES = 1_000_000;

/** Aim near this size so grid pins stay light without looking muddy. */
export const TARGET_PREVIEW_BYTES = 700_000;

/** Longest edge for the stored preview. */
export const MAX_PREVIEW_EDGE = 1280;

export type EncodedImagePreview = {
  buffer: Buffer;
  width: number;
  height: number;
  bytes: number;
};

/**
 * Encode a WebP preview that stays under 1 MB, preferring ~700 KB.
 */
export async function encodeImagePreview(
  input: Buffer,
): Promise<EncodedImagePreview> {
  const base = sharp(input, { failOn: "none", animated: false }).rotate();
  const meta = await base.metadata();
  let width = meta.width && meta.width > 0 ? meta.width : MAX_PREVIEW_EDGE;
  if (width > MAX_PREVIEW_EDGE) width = MAX_PREVIEW_EDGE;

  let quality = 72;
  let encoded = await render(input, width, quality);
  while (encoded.bytes > TARGET_PREVIEW_BYTES && quality > 48) {
    quality -= 8;
    encoded = await render(input, width, quality);
  }
  while (encoded.bytes > MAX_PREVIEW_BYTES && quality > 36) {
    quality -= 6;
    encoded = await render(input, width, quality);
  }
  while (encoded.bytes > MAX_PREVIEW_BYTES && width > 640) {
    width = Math.max(640, Math.round(width * 0.82));
    encoded = await render(input, width, Math.min(quality, 50));
  }
  if (encoded.bytes > MAX_PREVIEW_BYTES) {
    throw new Error(
      `Preview still ${encoded.bytes} bytes after compression (max ${MAX_PREVIEW_BYTES})`,
    );
  }
  return encoded;
}

async function render(
  input: Buffer,
  width: number,
  quality: number,
): Promise<EncodedImagePreview> {
  const buffer = await sharp(input, { failOn: "none", animated: false })
    .rotate()
    .resize({
      width,
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer();
  const info = await sharp(buffer).metadata();
  return {
    buffer,
    width: info.width && info.width > 0 ? info.width : width,
    height: info.height && info.height > 0 ? info.height : width,
    bytes: buffer.byteLength,
  };
}
