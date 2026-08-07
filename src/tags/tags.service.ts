import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ArchiveItemEntity } from "../archive-items/entities/archive-item.entity";
import type { TagSummary } from "./dto/tag-summary.dto";

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(ArchiveItemEntity)
    private readonly archiveItems: Repository<ArchiveItemEntity>,
  ) {}

  /**
   * Collection-wide tag vocabulary with usage counts.
   * Ordered by count DESC, then tag ASC (ADR 0008).
   */
  async listSummaries(): Promise<TagSummary[]> {
    const rows: unknown = await this.archiveItems.query(
      `
      SELECT t.tag AS tag, COUNT(*)::int AS count
      FROM archive_items item
      CROSS JOIN LATERAL unnest(item.tags) AS t(tag)
      GROUP BY t.tag
      ORDER BY count DESC, t.tag ASC
      `,
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
