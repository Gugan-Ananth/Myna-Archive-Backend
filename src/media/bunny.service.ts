import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "crypto";
import {
  formatAllowedForMediaType,
  type MediaType,
  mimeMatchesMediaType,
} from "../common/media-type";
import type {
  UploadSignatureDto,
  UploadSignatureResponse,
} from "./dto/upload-signature.dto";

export type BunnyResourceInfo = {
  publicId: string;
  resourceType: "image" | "video";
  bytes: number;
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
  status?: number;
  /** Comma-separated heights from Stream, e.g. "240,360,480,720,1080". */
  availableResolutions?: string;
  /** Bunny Stream encoder diagnostics when status is error. */
  transcodingMessages?: string[];
  hasOriginal?: boolean;
};

export type DerivedMediaUrls = {
  mediaUrl: string;
  thumbnailUrl: string;
};

/** Bunny Stream video status codes (subset). */
const STREAM_STATUS = {
  created: 0,
  uploaded: 1,
  processing: 2,
  transcoding: 3,
  finished: 4,
  error: 5,
  uploadFailed: 6,
} as const;

type StreamVideoResponse = {
  guid?: string;
  title?: string;
  length?: number;
  status?: number;
  width?: number;
  height?: number;
  storageSize?: number;
  availableResolutions?: string | null;
  thumbnailUrl?: string | null;
  thumbnailFileName?: string | null;
  hasMP4Fallback?: boolean;
  hasOriginal?: boolean;
  encodeProgress?: number;
  transcodingMessages?: Array<{
    timeStamp?: string;
    level?: number;
    issueCode?: number;
    message?: string;
    value?: string | null;
  }> | null;
};

type StorageListItem = {
  ObjectName?: string;
  Path?: string;
  Length?: number;
  IsDirectory?: boolean;
  ContentType?: string;
};

@Injectable()
export class BunnyService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BunnyService.name);

  constructor(private readonly config: ConfigService) {}

  async onApplicationBootstrap(): Promise<void> {
    const ok = await this.ping();
    if (ok) {
      this.logger.log("Bunny.net APIs accessible");
    } else {
      this.logger.warn(
        "Bunny.net not fully reachable — check storage/stream credentials and network",
      );
    }
  }

  async ping(): Promise<boolean> {
    const [storageOk, streamOk] = await Promise.all([
      this.pingStorage(),
      this.pingStream(),
    ]);
    return storageOk && streamOk;
  }

  getFolder(): string {
    return this.config.get<string>("bunny.storage.folder") ?? "myna-archive";
  }

  async createUploadSignature(
    dto: UploadSignatureDto,
  ): Promise<UploadSignatureResponse> {
    const { mediaType, mimeType, byteSize, fileName } = dto;

    if (!mimeMatchesMediaType(mimeType, mediaType)) {
      throw new BadRequestException(
        `MIME type "${mimeType}" is not allowed for mediaType "${mediaType}"`,
      );
    }

    const maxBytes =
      mediaType === "image"
        ? this.config.getOrThrow<number>("upload.maxImageBytes")
        : this.config.getOrThrow<number>("upload.maxVideoBytes");

    if (byteSize > maxBytes) {
      throw new BadRequestException(
        `File size ${byteSize} exceeds max ${maxBytes} bytes for ${mediaType}`,
      );
    }

    const chunkSize = this.config.getOrThrow<number>("upload.chunkBytes");

    if (mediaType === "image") {
      return this.createImageUploadSignature({
        mimeType,
        maxBytes,
        chunkSize,
        fileName,
      });
    }

    return this.createVideoUploadSignature({
      mimeType,
      maxBytes,
      chunkSize,
      fileName,
    });
  }

  /**
   * Verify asset exists, type/size/format match product rules, return derived URLs.
   */
  async verifyAndDeriveUrls(params: {
    publicId: string;
    resourceType: "image" | "video";
    mediaType: MediaType;
  }): Promise<{ resource: BunnyResourceInfo; urls: DerivedMediaUrls }> {
    const { publicId, resourceType, mediaType } = params;

    if (resourceType !== mediaType) {
      throw new BadRequestException(
        `resourceType "${resourceType}" must match mediaType "${mediaType}"`,
      );
    }

    let resource =
      mediaType === "image"
        ? await this.getImageResource(publicId)
        : await this.getVideoResource(publicId);

    const maxBytes =
      mediaType === "image"
        ? this.config.getOrThrow<number>("upload.maxImageBytes")
        : this.config.getOrThrow<number>("upload.maxVideoBytes");

    if (resource.bytes > maxBytes) {
      throw new BadRequestException(
        `Uploaded asset size ${resource.bytes} exceeds max ${maxBytes} for ${mediaType}`,
      );
    }

    if (
      mediaType === "image" &&
      !formatAllowedForMediaType(resource.format, mediaType)
    ) {
      throw new BadRequestException(
        `Format "${resource.format ?? "unknown"}" is not allowed for ${mediaType}`,
      );
    }

    if (mediaType === "video") {
      // Right after TUS, status can still be "created" briefly — retry a few times.
      let videoResource = resource;
      if (
        (videoResource.status ?? STREAM_STATUS.created) ===
        STREAM_STATUS.created
      ) {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          await new Promise((r) => setTimeout(r, 800));
          videoResource = await this.getVideoResource(publicId);
          if (
            (videoResource.status ?? STREAM_STATUS.created) !==
            STREAM_STATUS.created
          ) {
            break;
          }
        }
      }

      const status = videoResource.status ?? STREAM_STATUS.created;

      if (
        status === STREAM_STATUS.error ||
        status === STREAM_STATUS.uploadFailed
      ) {
        const detail = videoResource.transcodingMessages?.length
          ? videoResource.transcodingMessages.join(" · ")
          : `Bunny Stream status=${status}`;
        throw new BadRequestException(
          `Video transcoding failed on Bunny Stream (${detail}). Try a standard H.264/AAC MP4, or re-export the file and upload again.`,
        );
      }

      if (status === STREAM_STATUS.created) {
        throw new BadRequestException(
          `Bunny Stream video is not ready for archive (status=${status}). Upload may still be in progress — wait a moment and try saving again.`,
        );
      }

      // Prefer the refreshed resource (may include resolutions once processing starts).
      resource = videoResource;
    }

    const urls = this.buildUrls(publicId, mediaType, resource);
    return { resource, urls };
  }

  buildUrls(
    publicId: string,
    mediaType: MediaType,
    resource?: BunnyResourceInfo,
  ): DerivedMediaUrls {
    if (mediaType === "image") {
      const cdn = this.config.getOrThrow<string>("bunny.cdn.hostname");
      const path = publicId.replace(/^\/+/, "");
      const base = `https://${cdn}/${path}`;
      const thumbQuery =
        this.config.get<string>("bunny.cdn.imageThumbQuery") ??
        "width=480&height=270&aspect_ratio=16:9&quality=80";

      return {
        mediaUrl: base,
        thumbnailUrl: `${base}?${thumbQuery}`,
      };
    }

    const streamCdn = this.config.getOrThrow<string>(
      "bunny.stream.cdnHostname",
    );
    const videoId = publicId;
    const resolution = this.pickProgressiveResolution(resource);
    const mediaUrl = `https://${streamCdn}/${videoId}/play_${resolution}p.mp4`;
    const thumbnailUrl = `https://${streamCdn}/${videoId}/thumbnail.jpg`;

    return { mediaUrl, thumbnailUrl };
  }

  async destroy(
    publicId: string,
    resourceType: "image" | "video",
  ): Promise<void> {
    try {
      if (resourceType === "image") {
        await this.destroyImage(publicId);
        // Storage DELETE does not drop edge/Optimizer cache — purge so
        // deleted media cannot keep serving from CDN.
        await this.purgeImageCdnCache(publicId);
      } else {
        await this.destroyVideo(publicId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Best-effort: log and continue so DB delete is not blocked by a missing asset.
      this.logger.warn(
        `Bunny destroy failed for ${publicId} (${resourceType}): ${message}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Image (Edge Storage + CDN / Optimizer)
  // ---------------------------------------------------------------------------

  private createImageUploadSignature(params: {
    mimeType: string;
    maxBytes: number;
    chunkSize: number;
    fileName?: string;
  }): UploadSignatureResponse {
    const folder = this.getFolder().replace(/^\/+|\/+$/g, "");
    const ext = this.extensionFromMime(params.mimeType);
    const assetId = randomUUID();
    const publicId = `${folder}/${assetId}${ext}`;

    const zone = this.config.getOrThrow<string>("bunny.storage.zoneName");
    const hostname = this.config.getOrThrow<string>("bunny.storage.hostname");
    const accessKey = this.config.getOrThrow<string>("bunny.storage.password");
    const uploadUrl = `https://${hostname}/${zone}/${publicId}`;

    // Single-user v1 (ADR 0003): storage AccessKey is returned for direct browser PUT.
    // Bunny Edge Storage has no time-limited signed upload equivalent to Cloudinary.
    return {
      provider: "bunny",
      mediaType: "image",
      resourceType: "image",
      publicId,
      uploadMethod: "PUT",
      uploadUrl,
      accessKey,
      headers: {
        AccessKey: accessKey,
        "Content-Type": "application/octet-stream",
      },
      chunkSize: params.chunkSize,
      maxBytes: params.maxBytes,
    };
  }

  private async getImageResource(publicId: string): Promise<BunnyResourceInfo> {
    const zone = this.config.getOrThrow<string>("bunny.storage.zoneName");
    const hostname = this.config.getOrThrow<string>("bunny.storage.hostname");
    const accessKey = this.config.getOrThrow<string>("bunny.storage.password");
    const path = publicId.replace(/^\/+/, "");
    const url = `https://${hostname}/${zone}/${path}`;

    try {
      // Range request avoids downloading the full object while still verifying existence/size.
      const response = await fetch(url, {
        method: "GET",
        headers: {
          AccessKey: accessKey,
          Range: "bytes=0-0",
        },
      });

      if (response.status === 404) {
        throw new NotFoundException(
          `Bunny Storage asset not found: ${publicId}`,
        );
      }

      if (!response.ok && response.status !== 206) {
        // Fallback: list parent directory for metadata (some regions differ on Range).
        return this.getImageResourceViaList(publicId);
      }

      const contentRange = response.headers.get("content-range");
      const contentLengthHeader = response.headers.get("content-length");
      let bytes = 0;

      if (contentRange) {
        // e.g. "bytes 0-0/12345"
        const total = contentRange.split("/")[1];
        bytes = total ? Number(total) : 0;
      } else if (contentLengthHeader) {
        bytes = Number(contentLengthHeader);
      }

      // Consume body so the connection can close cleanly.
      await response.arrayBuffer().catch(() => undefined);

      if (!Number.isFinite(bytes) || bytes <= 0) {
        return this.getImageResourceViaList(publicId);
      }

      return {
        publicId,
        resourceType: "image",
        bytes,
        format: this.formatFromPath(publicId),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Bunny Storage resource fetch failed: ${message}`);
      throw new BadRequestException(
        `Unable to verify Bunny Storage asset: ${publicId}`,
      );
    }
  }

  private async getImageResourceViaList(
    publicId: string,
  ): Promise<BunnyResourceInfo> {
    const zone = this.config.getOrThrow<string>("bunny.storage.zoneName");
    const hostname = this.config.getOrThrow<string>("bunny.storage.hostname");
    const accessKey = this.config.getOrThrow<string>("bunny.storage.password");
    const path = publicId.replace(/^\/+/, "");
    const slash = path.lastIndexOf("/");
    const dir = slash >= 0 ? path.slice(0, slash + 1) : "";
    const fileName = slash >= 0 ? path.slice(slash + 1) : path;
    const listUrl = `https://${hostname}/${zone}/${dir}`;

    const response = await fetch(listUrl, {
      method: "GET",
      headers: {
        AccessKey: accessKey,
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      throw new NotFoundException(`Bunny Storage asset not found: ${publicId}`);
    }

    if (!response.ok) {
      throw new BadRequestException(
        `Unable to verify Bunny Storage asset: ${publicId}`,
      );
    }

    const items = (await response.json()) as StorageListItem[];
    const match = Array.isArray(items)
      ? items.find(
          (item) =>
            !item.IsDirectory &&
            (item.ObjectName === fileName ||
              item.ObjectName === path ||
              item.Path?.endsWith(fileName)),
        )
      : undefined;

    if (!match) {
      throw new NotFoundException(`Bunny Storage asset not found: ${publicId}`);
    }

    return {
      publicId,
      resourceType: "image",
      bytes: Number(match.Length ?? 0),
      format: this.formatFromPath(publicId),
    };
  }

  private async destroyImage(publicId: string): Promise<void> {
    const zone = this.config.getOrThrow<string>("bunny.storage.zoneName");
    const hostname = this.config.getOrThrow<string>("bunny.storage.hostname");
    const accessKey = this.config.getOrThrow<string>("bunny.storage.password");
    const path = publicId.replace(/^\/+/, "");
    const url = `https://${hostname}/${zone}/${path}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: { AccessKey: accessKey },
    });

    if (!response.ok && response.status !== 404) {
      const body = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${body}`);
    }
  }

  /**
   * Purge Pull Zone edge cache (and Optimizer variants via URL wildcard)
   * for a deleted Storage object. Requires BUNNY_API_KEY (account API key).
   * No-ops when the key is unset so local/dev without account access still works.
   *
   * @see https://docs.bunny.net/reference/purgepublic_indexpost
   */
  private async purgeImageCdnCache(publicId: string): Promise<void> {
    const apiKey = this.config.get<string>("bunny.cdn.apiKey");
    if (!apiKey?.trim()) {
      this.logger.debug(
        "Skipping Bunny CDN purge (BUNNY_API_KEY not set) for " + publicId,
      );
      return;
    }

    const cdn = this.config.getOrThrow<string>("bunny.cdn.hostname");
    const path = publicId.replace(/^\/+/, "");
    // Trailing * clears Optimizer query variants of the same object.
    const purgeUrl = `https://${cdn}/${path}*`;

    try {
      const endpoint = new URL("https://api.bunny.net/purge");
      endpoint.searchParams.set("url", purgeUrl);
      endpoint.searchParams.set("async", "true");

      const response = await fetch(endpoint.toString(), {
        method: "POST",
        headers: { AccessKey: apiKey },
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        this.logger.warn(
          `Bunny CDN purge failed for ${purgeUrl}: HTTP ${response.status} ${body}`,
        );
        return;
      }

      this.logger.log(`Purged Bunny CDN cache for ${purgeUrl}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Bunny CDN purge error for ${publicId}: ${message}`);
    }
  }

  private async pingStorage(): Promise<boolean> {
    try {
      const zone = this.config.getOrThrow<string>("bunny.storage.zoneName");
      const hostname = this.config.getOrThrow<string>("bunny.storage.hostname");
      const accessKey = this.config.getOrThrow<string>(
        "bunny.storage.password",
      );
      const folder = this.getFolder().replace(/^\/+|\/+$/g, "");
      // List folder (or zone root) — cheap existence check for credentials.
      const url = `https://${hostname}/${zone}/${folder}/`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          AccessKey: accessKey,
          Accept: "application/json",
        },
      });
      // 200 list or 404 empty folder both prove auth works on many setups.
      return response.ok || response.status === 404;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Bunny Storage ping failed: ${message}`);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Video (Bunny Stream + TUS)
  // ---------------------------------------------------------------------------

  private async createVideoUploadSignature(params: {
    mimeType: string;
    maxBytes: number;
    chunkSize: number;
    fileName?: string;
  }): Promise<UploadSignatureResponse> {
    const libraryId = this.config.getOrThrow<string>("bunny.stream.libraryId");
    const apiKey = this.config.getOrThrow<string>("bunny.stream.apiKey");
    const title =
      params.fileName?.trim() || `myna-archive-${randomUUID().slice(0, 8)}`;

    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          AccessKey: apiKey,
        },
        body: JSON.stringify({ title }),
      },
    );

    if (!createResponse.ok) {
      const body = await createResponse.text().catch(() => "");
      this.logger.warn(
        `Bunny Stream create video failed: HTTP ${createResponse.status} ${body}`,
      );
      throw new BadRequestException(
        "Unable to create Bunny Stream video object for upload",
      );
    }

    const video = (await createResponse.json()) as StreamVideoResponse;
    const videoId = video.guid;
    if (!videoId) {
      throw new BadRequestException(
        "Bunny Stream create video response missing guid",
      );
    }

    // Allow long uploads (1 GB) — default 24h, overridable via env.
    const expireSeconds = this.config.get<number>(
      "bunny.stream.uploadExpireSeconds",
    );
    const expirationTime =
      Math.floor(Date.now() / 1000) +
      (expireSeconds && expireSeconds > 0 ? expireSeconds : 86_400);

    const signature = createHash("sha256")
      .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
      .digest("hex");

    return {
      provider: "bunny",
      mediaType: "video",
      resourceType: "video",
      publicId: videoId,
      uploadMethod: "TUS",
      tusEndpoint: "https://video.bunnycdn.com/tusupload",
      libraryId,
      videoId,
      expirationTime,
      signature,
      chunkSize: params.chunkSize,
      maxBytes: params.maxBytes,
    };
  }

  private async getVideoResource(publicId: string): Promise<BunnyResourceInfo> {
    const libraryId = this.config.getOrThrow<string>("bunny.stream.libraryId");
    const apiKey = this.config.getOrThrow<string>("bunny.stream.apiKey");
    const url = `https://video.bunnycdn.com/library/${libraryId}/videos/${publicId}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          AccessKey: apiKey,
        },
      });

      if (response.status === 404) {
        throw new NotFoundException(
          `Bunny Stream video not found: ${publicId}`,
        );
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        this.logger.warn(
          `Bunny Stream get video failed: HTTP ${response.status} ${body}`,
        );
        throw new BadRequestException(
          `Unable to verify Bunny Stream video: ${publicId}`,
        );
      }

      const video = (await response.json()) as StreamVideoResponse;

      const transcodingMessages = Array.isArray(video.transcodingMessages)
        ? video.transcodingMessages
            .map((m) => m.message?.trim())
            .filter((m): m is string => Boolean(m))
        : undefined;

      return {
        publicId: video.guid ?? publicId,
        resourceType: "video",
        bytes: Number(video.storageSize ?? 0),
        format: "mp4",
        width: typeof video.width === "number" ? video.width : undefined,
        height: typeof video.height === "number" ? video.height : undefined,
        duration: typeof video.length === "number" ? video.length : undefined,
        status: typeof video.status === "number" ? video.status : undefined,
        availableResolutions:
          typeof video.availableResolutions === "string"
            ? video.availableResolutions
            : undefined,
        transcodingMessages,
        hasOriginal: video.hasOriginal === true,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Bunny Stream resource fetch failed: ${message}`);
      throw new BadRequestException(
        `Unable to verify Bunny Stream video: ${publicId}`,
      );
    }
  }

  private async destroyVideo(publicId: string): Promise<void> {
    const libraryId = this.config.getOrThrow<string>("bunny.stream.libraryId");
    const apiKey = this.config.getOrThrow<string>("bunny.stream.apiKey");
    const url = `https://video.bunnycdn.com/library/${libraryId}/videos/${publicId}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        AccessKey: apiKey,
      },
    });

    if (!response.ok && response.status !== 404) {
      const body = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${body}`);
    }
  }

  private async pingStream(): Promise<boolean> {
    try {
      const libraryId = this.config.getOrThrow<string>(
        "bunny.stream.libraryId",
      );
      const apiKey = this.config.getOrThrow<string>("bunny.stream.apiKey");
      // Lightweight list call (page size 1).
      const url = `https://video.bunnycdn.com/library/${libraryId}/videos?page=1&itemsPerPage=1`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          AccessKey: apiKey,
        },
      });
      return response.ok;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Bunny Stream ping failed: ${message}`);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private pickProgressiveResolution(resource?: BunnyResourceInfo): string {
    const preferred = (
      this.config.get<string>("bunny.stream.defaultResolution") ?? "720"
    ).replace(/p$/i, "");

    const raw = resource?.availableResolutions?.trim();
    if (!raw) {
      return preferred;
    }

    const heights = raw
      .split(",")
      .map((part) => Number(part.trim().replace(/p$/i, "")))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);

    if (heights.length === 0) {
      return preferred;
    }

    // Prefer configured height when present; otherwise highest available.
    if (heights.includes(Number(preferred))) {
      return preferred;
    }
    return String(heights[heights.length - 1]);
  }

  private extensionFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "video/mp4": ".mp4",
      "video/webm": ".webm",
      "video/quicktime": ".mov",
    };
    return map[mimeType.toLowerCase()] ?? "";
  }

  private formatFromPath(path: string): string | undefined {
    const base = path.split("/").pop() ?? path;
    const dot = base.lastIndexOf(".");
    if (dot < 0) {
      return undefined;
    }
    return base.slice(dot + 1).toLowerCase();
  }
}
