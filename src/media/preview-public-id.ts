/** Strip CDN/optimizer query so we compare the stored object path. */
export function stripMediaQuery(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.split("?")[0]?.split("#")[0] ?? url;
  }
}

/**
 * `myna-archive/{uuid}.png` → `myna-archive/{uuid}-preview.webp`
 * Already-preview paths are returned unchanged.
 */
export function previewPublicIdFor(originalPublicId: string): string {
  const path = originalPublicId.replace(/^\/+/, "");
  if (/-preview\.webp$/i.test(path)) return path;
  const dot = path.lastIndexOf(".");
  const stem = dot >= 0 ? path.slice(0, dot) : path;
  return `${stem}-preview.webp`;
}

export function isStoredPreviewPublicId(publicId: string): boolean {
  return /-preview\.webp$/i.test(publicId.replace(/^\/+/, ""));
}

export function isStoredPreviewUrl(previewUrl: string, originalUrl: string): boolean {
  if (!previewUrl) return false;
  const preview = stripMediaQuery(previewUrl);
  const original = stripMediaQuery(originalUrl);
  if (!preview || !original) return false;
  return preview !== original;
}
