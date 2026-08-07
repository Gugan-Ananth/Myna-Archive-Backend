export type MediaType = "image" | "video";

/** Provider-agnostic resource kind stored on Archive Item (`resourceType`). */
export type MediaResourceType = "image" | "video";

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const IMAGE_FORMATS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
export const VIDEO_FORMATS = new Set(["mp4", "webm", "mov", "qt"]);

export function isMediaType(value: string): value is MediaType {
  return value === "image" || value === "video";
}

export function mimeMatchesMediaType(
  mimeType: string,
  mediaType: MediaType,
): boolean {
  const normalized = mimeType.toLowerCase();
  if (mediaType === "image") {
    return (IMAGE_MIME_TYPES as readonly string[]).includes(normalized);
  }
  return (VIDEO_MIME_TYPES as readonly string[]).includes(normalized);
}

export function formatAllowedForMediaType(
  format: string | undefined,
  mediaType: MediaType,
): boolean {
  if (!format) {
    return true;
  }
  const normalized = format.toLowerCase();
  return mediaType === "image"
    ? IMAGE_FORMATS.has(normalized)
    : VIDEO_FORMATS.has(normalized);
}
