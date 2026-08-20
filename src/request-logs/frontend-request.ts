type HeaderValue = string | string[] | undefined;

const API_PREFIX = "/api/v1";

function firstHeaderValue(value: HeaderValue): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return null;
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function isApiPath(path: string): boolean {
  return path === API_PREFIX || path.startsWith(`${API_PREFIX}/`);
}

/**
 * True when the request was issued by the configured frontend (CORS origin),
 * not a scanner, CDN crawler, or Next.js server-side fetch without Origin.
 */
export function isFrontendRequest(
  headers: {
    origin?: HeaderValue;
    referer?: HeaderValue;
    referrer?: HeaderValue;
  },
  corsOrigin: string,
): boolean {
  const allowed = originOf(corsOrigin.trim());
  if (!allowed) return false;

  const origin = firstHeaderValue(headers.origin);
  if (origin && originOf(origin) === allowed) return true;

  const referer = firstHeaderValue(headers.referer) ?? firstHeaderValue(headers.referrer);
  if (!referer) return false;
  return originOf(referer) === allowed;
}
