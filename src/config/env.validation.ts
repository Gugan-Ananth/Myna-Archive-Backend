/**
 * Validates required environment variables at bootstrap.
 * Throws early with a clear message if anything critical is missing.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const required = [
    "DB_HOST",
    "DB_PORT",
    "DB_USERNAME",
    "DB_PASSWORD",
    "DB_DATABASE",
    "BUNNY_STORAGE_ZONE_NAME",
    "BUNNY_STORAGE_PASSWORD",
    "BUNNY_CDN_HOSTNAME",
    "BUNNY_STREAM_LIBRARY_ID",
    "BUNNY_STREAM_API_KEY",
    "BUNNY_STREAM_CDN_HOSTNAME",
    "AUTH_EMAIL",
    "AUTH_PASSWORD",
    "AUTH_TOKEN_SECRET",
  ] as const;

  const missing = required.filter((key) => {
    const value = config[key];
    if (value === undefined || value === null) return true;
    if (typeof value === "string") return value.trim() === "";
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value).trim() === "";
    }
    return true;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return config;
}
