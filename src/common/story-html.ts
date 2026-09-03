/** Max inline images in one written story. */
export const MAX_STORY_ASSETS = 20;

/** Max `bodyHtml` characters on create/update. Matches the frontend composer. */
export const MAX_STORY_BODY_CHARS = 200_000;

const IMG_TAG = /<img\b[^>]*>/gi;
const BLOCKED_TAGS = /<\/?(script|style|iframe|object|embed|link|meta|form|input|textarea|button)[^>]*>/gi;
const EVENT_ATTRS = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL = /\s(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractAttr(tag: string, name: string): string {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"),
  );
  return match?.[2] ?? match?.[3] ?? "";
}

/** Strip scripts and handlers; keep formatting tags the composer emits. */
export function sanitizeStoryHtml(html: string): string {
  return html
    .replace(BLOCKED_TAGS, "")
    .replace(EVENT_ATTRS, "")
    .replace(JS_URL, "");
}

export function countStoryImages(html: string): number {
  return html.match(IMG_TAG)?.length ?? 0;
}

/**
 * Optional cover is an extra leading asset that is not in the body HTML.
 * - assets.length === imgCount → every asset is an inline body image
 * - assets.length === imgCount + 1 → assets[0] is the cover; the rest bind in order
 */
export function partitionStoryAssets<T>(
  html: string,
  assets: T[],
): { cover: T | null; body: T[] } | null {
  const imgCount = countStoryImages(html);
  if (assets.length === imgCount + 1) {
    return { cover: assets[0] ?? null, body: assets.slice(1) };
  }
  if (assets.length === imgCount) {
    return { cover: null, body: assets };
  }
  return null;
}

/**
 * Rewrite every <img> in document order to the verified CDN URL
 * for assets[i], so inline images stay in the same place.
 */
export function applyStoryAssets(
  html: string,
  assets: Array<{ mediaUrl: string }>,
): string {
  let index = 0;
  return html.replace(IMG_TAG, () => {
    const asset = assets[index];
    const current = index;
    index += 1;
    if (!asset) return "";
    return `<img src="${escapeAttr(asset.mediaUrl)}" alt="" data-story-asset="${current}" />`;
  });
}
