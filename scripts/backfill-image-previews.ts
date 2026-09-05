/**
 * Create a stored <1 MB WebP preview for every original image and point
 * `thumbnailUrl` at that file. Videos are skipped (Stream already has a poster).
 *
 *   yarn preview:backfill
 *
 * Safe to re-run: existing `image_previews` rows are reused.
 */
import { NestFactory } from "@nestjs/core";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { AppModule } from "../src/app.module";
import { ArchiveItemEntity } from "../src/archive-items/entities/archive-item.entity";
import { mapLimit } from "../src/common/map-limit";
import { ImagePreviewService } from "../src/media/image-preview.service";
import { isStoredPreviewUrl } from "../src/media/preview-public-id";
import { OriginalCharacterEntity } from "../src/original-characters/entities/original-character.entity";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });
  const previews = app.get(ImagePreviewService);
  const items = app.get<Repository<ArchiveItemEntity>>(
    getRepositoryToken(ArchiveItemEntity),
  );
  const ocs = app.get<Repository<OriginalCharacterEntity>>(
    getRepositoryToken(OriginalCharacterEntity),
  );

  const stats = { processed: 0, updated: 0, skipped: 0, failed: 0 };

  const archiveItems = await items.find();
  await mapLimit(archiveItems, 2, async (item) => {
    try {
      const changed = await backfillArchiveItem(item, previews);
      stats.processed += 1;
      if (changed) {
        await items.save(item);
        stats.updated += 1;
        console.log(`updated archive item ${item.id}`);
      } else {
        stats.skipped += 1;
      }
    } catch (error) {
      stats.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`failed archive item ${item.id}: ${message}`);
    }
  });

  const characters = await ocs.find();
  await mapLimit(characters, 2, async (oc) => {
    try {
      if (!oc.publicId) {
        stats.skipped += 1;
        return;
      }
      const previewUrl = await previews.thumbnailUrlFor(
        oc.publicId,
        oc.thumbnailUrl,
      );
      stats.processed += 1;
      if (previewUrl !== oc.thumbnailUrl) {
        oc.thumbnailUrl = previewUrl;
        await ocs.save(oc);
        stats.updated += 1;
        console.log(`updated original character ${oc.id}`);
      } else {
        stats.skipped += 1;
      }
    } catch (error) {
      stats.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`failed original character ${oc.id}: ${message}`);
    }
  });

  console.log(JSON.stringify(stats));
  await app.close();
  if (stats.failed > 0) process.exitCode = 1;
}

async function backfillArchiveItem(
  item: ArchiveItemEntity,
  previews: ImagePreviewService,
): Promise<boolean> {
  let changed = false;

  const assets = item.mediaAssets ?? [];
  for (const asset of assets) {
    if (!asset.publicId || asset.resourceType === "video") continue;
    const previewUrl = await previews.thumbnailUrlFor(
      asset.publicId,
      asset.thumbnailUrl,
    );
    if (previewUrl !== asset.thumbnailUrl) {
      asset.thumbnailUrl = previewUrl;
      changed = true;
    }
  }
  if (changed) item.mediaAssets = assets;

  for (const character of item.characters ?? []) {
    if (!character.publicId) continue;
    const previewUrl = await previews.thumbnailUrlFor(
      character.publicId,
      character.thumbnailUrl,
    );
    if (previewUrl !== character.thumbnailUrl) {
      character.thumbnailUrl = previewUrl;
      changed = true;
    }
  }

  const cover = assets[0];
  if (
    cover &&
    cover.resourceType !== "video" &&
    cover.thumbnailUrl &&
    cover.thumbnailUrl !== item.thumbnailUrl
  ) {
    item.thumbnailUrl = cover.thumbnailUrl;
    changed = true;
  } else if (
    item.publicId &&
    item.resourceType !== "video" &&
    item.mediaType !== "video" &&
    !isStoredPreviewUrl(item.thumbnailUrl, item.mediaUrl)
  ) {
    const previewUrl = await previews.thumbnailUrlFor(
      item.publicId,
      item.thumbnailUrl,
    );
    if (previewUrl !== item.thumbnailUrl) {
      item.thumbnailUrl = previewUrl;
      changed = true;
    }
  }

  return changed;
}

void main();
