/**
 * Typed config factory for Nest ConfigModule.
 * Values are read from process.env (loaded from .env by ConfigModule).
 */
export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_DATABASE,
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER ?? 'myna-archive',
    thumbTransform:
      process.env.CLOUDINARY_THUMB_TRANSFORM ??
      'c_fill,w_480,h_270,q_auto:eco',
    imageTransform: process.env.CLOUDINARY_IMAGE_TRANSFORM ?? 'q_auto:best',
    videoPosterTransform:
      process.env.CLOUDINARY_VIDEO_POSTER_TRANSFORM ??
      'so_0,w_480,h_270,c_fill,q_auto:eco',
  },
  upload: {
    maxImageBytes: parseInt(process.env.MAX_IMAGE_BYTES ?? '52428800', 10),
    maxVideoBytes: parseInt(process.env.MAX_VIDEO_BYTES ?? '1073741824', 10),
    chunkBytes: parseInt(process.env.UPLOAD_CHUNK_BYTES ?? '20971520', 10),
  },
});
