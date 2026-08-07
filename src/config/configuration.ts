/**
 * Typed config factory for Nest ConfigModule.
 * Values are read from process.env (loaded from .env by ConfigModule).
 */
export default () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3001", 10),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  database: {
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_DATABASE,
    synchronize: process.env.DB_SYNC === "true",
    logging: process.env.DB_LOGGING === "true",
  },
  bunny: {
    storage: {
      zoneName: process.env.BUNNY_STORAGE_ZONE_NAME,
      password: process.env.BUNNY_STORAGE_PASSWORD,
      /** e.g. storage.bunnycdn.com or ny.storage.bunnycdn.com */
      hostname: process.env.BUNNY_STORAGE_HOSTNAME ?? "storage.bunnycdn.com",
      folder: process.env.BUNNY_STORAGE_FOLDER ?? "myna-archive",
    },
    cdn: {
      /** Pull Zone hostname for image delivery, e.g. myzone.b-cdn.net */
      hostname: process.env.BUNNY_CDN_HOSTNAME,
      /** Bunny Optimizer query string for grid thumbnails */
      imageThumbQuery:
        process.env.BUNNY_IMAGE_THUMB_QUERY ??
        "width=480&height=270&aspect_ratio=16:9&quality=80",
      /**
       * Account API key (Dashboard → Account → API). Optional; when set,
       * image deletes also purge Pull Zone / Optimizer edge cache for that URL.
       */
      apiKey: process.env.BUNNY_API_KEY,
    },
    stream: {
      libraryId: process.env.BUNNY_STREAM_LIBRARY_ID,
      apiKey: process.env.BUNNY_STREAM_API_KEY,
      /** Stream CDN hostname from library settings, e.g. vz-xxxxx.b-cdn.net */
      cdnHostname: process.env.BUNNY_STREAM_CDN_HOSTNAME,
      defaultResolution: process.env.BUNNY_STREAM_DEFAULT_RESOLUTION ?? "720",
      uploadExpireSeconds: parseInt(
        process.env.BUNNY_STREAM_UPLOAD_EXPIRE_SECONDS ?? "86400",
        10,
      ),
    },
  },
  upload: {
    maxImageBytes: parseInt(process.env.MAX_IMAGE_BYTES ?? "52428800", 10),
    maxVideoBytes: parseInt(process.env.MAX_VIDEO_BYTES ?? "1073741824", 10),
    chunkBytes: parseInt(process.env.UPLOAD_CHUNK_BYTES ?? "20971520", 10),
  },
});
