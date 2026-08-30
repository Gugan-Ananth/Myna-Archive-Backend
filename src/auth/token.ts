import { createHmac, timingSafeEqual } from "node:crypto";

export const ACCESS_TOKEN_VERSION = "myna1";
export const ACCESS_TOKEN_SUBJECT = "owner";

type AccessTokenPayload = {
  sub: typeof ACCESS_TOKEN_SUBJECT;
  iat: number;
};

/**
 * Never-expiring HMAC access token.
 * Format: `myna1.<base64url payload>.<base64url hmac>`.
 * No `exp` claim — validity is the signature + shared secret.
 */
export function signAccessToken(secret: string, iat = unixSeconds()): string {
  const payload = encodePayload({ sub: ACCESS_TOKEN_SUBJECT, iat });
  const signature = signPayload(secret, payload);
  return `${ACCESS_TOKEN_VERSION}.${payload}.${signature}`;
}

export function verifyAccessToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, payload, signature] = parts;
  if (version !== ACCESS_TOKEN_VERSION || !payload || !signature) return false;

  const expected = signPayload(secret, payload);
  if (!timingSafeEqualStrings(signature, expected)) return false;

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as AccessTokenPayload;
    return parsed.sub === ACCESS_TOKEN_SUBJECT && Number.isFinite(parsed.iat);
  } catch {
    return false;
  }
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  return timingSafeEqualStrings(a, b);
}

function encodePayload(payload: AccessTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret)
    .update(`${ACCESS_TOKEN_VERSION}.${payload}`)
    .digest("base64url");
}

function unixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  const size = Math.max(left.length, right.length, 1);
  const paddedLeft = Buffer.alloc(size);
  const paddedRight = Buffer.alloc(size);
  left.copy(paddedLeft);
  right.copy(paddedRight);
  return timingSafeEqual(paddedLeft, paddedRight) && left.length === right.length;
}
