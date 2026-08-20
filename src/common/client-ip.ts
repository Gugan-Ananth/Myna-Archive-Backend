type HeaderValue = string | string[] | undefined;

type RequestLike = {
  ip?: string;
  ips?: string[];
  headers: Record<string, HeaderValue>;
  socket?: { remoteAddress?: string };
};

function firstHeaderValue(value: HeaderValue): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return null;
}

function stripMappedIpv6(ip: string): string {
  return ip.startsWith("::ffff:") ? ip.slice("::ffff:".length) : ip;
}

/**
 * Client IP as seen by Nest/Express. Reads proxy headers first, then the
 * socket address. Query strings and bodies are never inspected.
 */
export function clientIpFromRequest(req: RequestLike): string | null {
  const forwarded = firstHeaderValue(req.headers["x-forwarded-for"]);
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return stripMappedIpv6(first);
  }

  const realIp = firstHeaderValue(req.headers["x-real-ip"]);
  if (realIp) return stripMappedIpv6(realIp);

  const cf = firstHeaderValue(req.headers["cf-connecting-ip"]);
  if (cf) return stripMappedIpv6(cf);

  const socketIp = req.ips?.[0] || req.ip || req.socket?.remoteAddress;
  if (!socketIp) return null;
  return stripMappedIpv6(socketIp);
}
