/**
 * Validates required environment variables at bootstrap.
 * Throws early with a clear message if anything critical is missing.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ] as const;

  const missing = required.filter((key) => {
    const value = config[key];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return config;
}
