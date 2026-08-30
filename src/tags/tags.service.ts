import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ArchiveItemEntity } from "../archive-items/entities/archive-item.entity";
import type { MediaType } from "../common/media-type";
import type { TagSummary } from "./dto/tag-summary.dto";

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(ArchiveItemEntity)
    private readonly archiveItems: Repository<ArchiveItemEntity>,
  ) {}

  /**
   * Tag vocabulary with usage counts, optionally scoped to a media section.
   * Ordered by count DESC, then tag ASC (ADR 0008).
   */
  async listSummaries(filter: {
    mediaType?: MediaType;
    imageGroup?: boolean;
  } = {}): Promise<TagSummary[]> {
    const params: string[] = [];
    const where: string[] = [];

    if (filter.mediaType) {
      params.push(filter.mediaType);
      where.push(`item."mediaType" = $${params.length}`);
    }

    if (filter.imageGroup === true) {
      where.push(
        `item."mediaAssets" IS NOT NULL AND jsonb_typeof(item."mediaAssets") = 'array' AND jsonb_array_length(item."mediaAssets") >= 2`,
      );
    } else if (filter.imageGroup === false) {
      where.push(
        `(item."mediaAssets" IS NULL OR jsonb_typeof(item."mediaAssets") <> 'array' OR jsonb_array_length(item."mediaAssets") <= 1)`,
      );
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const rows: unknown = await this.archiveItems.query(
      `
      SELECT t.tag AS tag, COUNT(*)::int AS count
      FROM archive_items item
      CROSS JOIN LATERAL unnest(item.tags) AS t(tag)
      ${whereSql}
      GROUP BY t.tag
      ORDER BY count DESC, t.tag ASC
      `,
      params,
    );

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row: unknown) => {
      const record =
        row !== null && typeof row === "object"
          ? (row as Record<string, unknown>)
          : {};
      const rawTag = record.tag;
      const tag =
        typeof rawTag === "string" || typeof rawTag === "number"
          ? String(rawTag)
          : "";
      return {
        tag,
        count: Number(record.count ?? 0),
      };
    });
  }
}
