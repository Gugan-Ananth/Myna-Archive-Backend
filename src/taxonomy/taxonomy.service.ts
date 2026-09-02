import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ArchiveItemEntity } from "../archive-items/entities/archive-item.entity";
import { humanizeSlug, slugify } from "../common/slugify";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateTaxonomyTagDto } from "./dto/create-taxonomy-tag.dto";
import { ReorderTaxonomyDto } from "./dto/reorder-taxonomy.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { UpdateTaxonomyTagDto } from "./dto/update-taxonomy-tag.dto";
import type {
  TaxonomyCategoryDto,
  TaxonomyTagDto,
} from "./dto/taxonomy-response.dto";
import { TagCategoryEntity } from "./entities/tag-category.entity";
import { TaxonomyTagEntity } from "./entities/taxonomy-tag.entity";
import { TAXONOMY_SEED } from "./seed";

@Injectable()
export class TaxonomyService implements OnModuleInit {
  private readonly logger = new Logger(TaxonomyService.name);

  constructor(
    @InjectRepository(TagCategoryEntity)
    private readonly categories: Repository<TagCategoryEntity>,
    @InjectRepository(TaxonomyTagEntity)
    private readonly tags: Repository<TaxonomyTagEntity>,
    @InjectRepository(ArchiveItemEntity)
    private readonly archiveItems: Repository<ArchiveItemEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedBuiltIns();
  }

  /** Seed built-ins only on an empty vocabulary so user deletes persist. */
  async seedBuiltIns(): Promise<void> {
    const existing = await this.categories.count();
    if (existing > 0) return;

    for (const seed of TAXONOMY_SEED) {
      let category = await this.categories.findOne({
        where: { slug: seed.slug },
      });
      if (!category) {
        category = await this.categories.save(
          this.categories.create({
            slug: seed.slug,
            label: seed.label,
            builtIn: true,
            sortOrder: seed.sortOrder,
          }),
        );
        this.logger.log(`Seeded taxonomy category: ${seed.slug}`);
      } else if (!category.builtIn) {
        category.builtIn = true;
        category.label = seed.label;
        category.sortOrder = seed.sortOrder;
        await this.categories.save(category);
      }

      for (const seedTag of seed.tags) {
        const existing = await this.tags.findOne({
          where: { categoryId: category.id, slug: seedTag.slug },
        });
        if (!existing) {
          await this.tags.save(
            this.tags.create({
              categoryId: category.id,
              slug: seedTag.slug,
              label: seedTag.label,
              builtIn: true,
              sortOrder: seedTag.sortOrder,
            }),
          );
        } else if (!existing.builtIn) {
          existing.builtIn = true;
          existing.label = seedTag.label;
          existing.sortOrder = seedTag.sortOrder;
          await this.tags.save(existing);
        }
      }
    }
  }

  async list(): Promise<TaxonomyCategoryDto[]> {
    const [categories, counts] = await Promise.all([
      this.categories.find({
        relations: { tags: true },
        order: {
          sortOrder: "ASC",
          label: "ASC",
          tags: { sortOrder: "ASC", label: "ASC" },
        },
      }),
      this.usageCounts(),
    ]);

    return categories.map((cat) => ({
      slug: cat.slug,
      label: cat.label,
      builtIn: cat.builtIn,
      tags: (cat.tags ?? []).map((tag) => this.toTagDto(cat.slug, tag, counts)),
    }));
  }

  async createCategory(dto: CreateCategoryDto): Promise<TaxonomyCategoryDto> {
    const label = dto.label.trim();
    const slug = slugify(label);
    if (!slug) {
      throw new BadRequestException("Category name is invalid after slugify");
    }

    let category = await this.categories.findOne({
      where: { slug },
      relations: { tags: true },
    });

    if (!category) {
      category = await this.categories.save(
        this.categories.create({
          slug,
          label,
          builtIn: false,
          sortOrder: await this.nextCategorySortOrder(),
        }),
      );
      category.tags = [];
    }

    if (dto.firstTag?.label?.trim()) {
      await this.ensureTagUnderCategory(category, dto.firstTag.label.trim());
    }

    return this.getCategoryDto(category.slug);
  }

  async createTag(
    categorySlug: string,
    dto: CreateTaxonomyTagDto,
  ): Promise<{ categorySlug: string; tag: TaxonomyTagDto }> {
    const catSlug = slugify(categorySlug);
    if (!catSlug) {
      throw new BadRequestException("Invalid category slug");
    }

    const category = await this.categories.findOne({
      where: { slug: catSlug },
    });
    if (!category) {
      throw new NotFoundException(`Category “${catSlug}” not found`);
    }

    const tag = await this.ensureTagUnderCategory(category, dto.label);
    const counts = await this.usageCounts();
    return {
      categorySlug: category.slug,
      tag: this.toTagDto(category.slug, tag, counts),
    };
  }

  async updateCategory(
    categorySlug: string,
    dto: UpdateCategoryDto,
  ): Promise<TaxonomyCategoryDto> {
    const category = await this.requireCategory(categorySlug);
    const label = dto.label.trim();
    const nextSlug = slugify(label);
    if (!nextSlug) {
      throw new BadRequestException("Category name is invalid after slugify");
    }

    if (nextSlug !== category.slug) {
      const taken = await this.categories.findOne({
        where: { slug: nextSlug },
      });
      if (taken) {
        throw new BadRequestException(`Category “${nextSlug}” already exists`);
      }
      await this.rewriteCategoryPrefix(category.slug, nextSlug);
      category.slug = nextSlug;
    }
    category.label = label;
    await this.categories.save(category);
    return this.getCategoryDto(category.slug);
  }

  async deleteCategory(categorySlug: string): Promise<void> {
    const category = await this.requireCategory(categorySlug, true);
    await this.rewriteCategoryPrefix(category.slug, null);
    await this.categories.remove(category);
  }

  async updateTag(
    categorySlug: string,
    tagSlug: string,
    dto: UpdateTaxonomyTagDto,
  ): Promise<{ categorySlug: string; tag: TaxonomyTagDto }> {
    if (!dto.label?.trim() && !dto.categorySlug?.trim()) {
      throw new BadRequestException(
        "Provide a new label or destination category",
      );
    }

    const source = await this.requireCategory(categorySlug);
    const tag = await this.requireTag(source, tagSlug);
    const fromEncoded = `${source.slug}:${tag.slug}`;

    const destSlug = dto.categorySlug?.trim()
      ? slugify(dto.categorySlug)
      : source.slug;
    if (!destSlug) {
      throw new BadRequestException("Invalid destination category");
    }
    const dest =
      destSlug === source.slug ? source : await this.requireCategory(destSlug);

    const nextLabel = dto.label?.trim() || tag.label;
    const nextSlug = dto.label?.trim() ? slugify(nextLabel) : tag.slug;
    if (!nextSlug) {
      throw new BadRequestException("Tag label is invalid after slugify");
    }

    const collision = await this.tags.findOne({
      where: { categoryId: dest.id, slug: nextSlug },
    });
    if (collision && collision.id !== tag.id) {
      await this.rewriteEncodedTag(
        fromEncoded,
        `${dest.slug}:${collision.slug}`,
      );
      await this.tags.remove(tag);
      const counts = await this.usageCounts();
      return {
        categorySlug: dest.slug,
        tag: this.toTagDto(dest.slug, collision, counts),
      };
    }

    const toEncoded = `${dest.slug}:${nextSlug}`;
    if (fromEncoded !== toEncoded) {
      await this.rewriteEncodedTag(fromEncoded, toEncoded);
    }
    tag.label = nextLabel;
    tag.slug = nextSlug;
    if (dest.id !== source.id) {
      tag.categoryId = dest.id;
      tag.builtIn = false;
      tag.sortOrder = await this.nextTagSortOrder(dest.id);
    } else {
      tag.categoryId = dest.id;
    }
    const saved = await this.tags.save(tag);
    const counts = await this.usageCounts();
    return {
      categorySlug: dest.slug,
      tag: this.toTagDto(dest.slug, saved, counts),
    };
  }

  async deleteTag(categorySlug: string, tagSlug: string): Promise<void> {
    const category = await this.requireCategory(categorySlug);
    const tag = await this.requireTag(category, tagSlug);
    await this.rewriteEncodedTag(`${category.slug}:${tag.slug}`, null);
    await this.tags.remove(tag);
  }

  /**
   * After normalizeTags on create/update: ensure every encoded `cat:tag`
   * exists in the taxonomy (auto-create user tags/categories as needed).
   * Freeform legacy tags (no colon) are ignored here.
   */
  async ensureEncodedTags(encodedTags: string[]): Promise<void> {
    for (const raw of encodedTags) {
      const parsed = parseEncodedTag(raw);
      if (!parsed) continue;

      let category = await this.categories.findOne({
        where: { slug: parsed.categorySlug },
      });
      if (!category) {
        category = await this.categories.save(
          this.categories.create({
            slug: parsed.categorySlug,
            label: humanizeSlug(parsed.categorySlug),
            builtIn: false,
            sortOrder: await this.nextCategorySortOrder(),
          }),
        );
      }

      const existing = await this.tags.findOne({
        where: { categoryId: category.id, slug: parsed.tagSlug },
      });
      if (!existing) {
        await this.tags.save(
          this.tags.create({
            categoryId: category.id,
            slug: parsed.tagSlug,
            label: humanizeSlug(parsed.tagSlug),
            builtIn: false,
            sortOrder: await this.nextTagSortOrder(category.id),
          }),
        );
      }
    }
  }

  private async requireCategory(
    categorySlug: string,
    withTags = false,
  ): Promise<TagCategoryEntity> {
    const slug = slugify(categorySlug);
    if (!slug) {
      throw new BadRequestException("Invalid category slug");
    }
    const category = await this.categories.findOne({
      where: { slug },
      ...(withTags ? { relations: { tags: true } } : {}),
    });
    if (!category) {
      throw new NotFoundException(`Category “${slug}” not found`);
    }
    return category;
  }

  private async requireTag(
    category: TagCategoryEntity,
    tagSlug: string,
  ): Promise<TaxonomyTagEntity> {
    const slug = slugify(tagSlug);
    if (!slug) {
      throw new BadRequestException("Invalid tag slug");
    }
    const tag = await this.tags.findOne({
      where: { categoryId: category.id, slug },
    });
    if (!tag) {
      throw new NotFoundException(
        `Tag “${slug}” not found in “${category.slug}”`,
      );
    }
    return tag;
  }

  /** Replace or strip one encoded tag on every archive item that uses it. */
  private async rewriteEncodedTag(
    from: string,
    to: string | null,
  ): Promise<void> {
    await this.archiveItems.query(
      `
      UPDATE archive_items AS item
      SET tags = COALESCE(
        (
          SELECT array_agg(mapped.value ORDER BY mapped.first_position)
          FROM (
            SELECT CASE WHEN tag = $1 THEN $2 ELSE tag END AS value,
                   MIN(position) AS first_position
            FROM unnest(item.tags) WITH ORDINALITY AS source(tag, position)
            WHERE tag IS NOT NULL
              AND (tag <> $1 OR $2 IS NOT NULL)
            GROUP BY CASE WHEN tag = $1 THEN $2 ELSE tag END
          ) AS mapped
        ),
        ARRAY[]::text[]
      ),
      "updatedAt" = now()
      WHERE $1 = ANY (item.tags)
      `,
      [from, to],
    );
  }

  private async rewriteCategoryPrefix(
    oldSlug: string,
    newSlug: string | null,
  ): Promise<void> {
    const prefix = `${oldSlug}:`;
    const pattern = `${prefix}%`;
    const nextPrefix = newSlug === null ? null : `${newSlug}:`;
    await this.archiveItems.query(
      `
      UPDATE archive_items AS item
      SET tags = COALESCE(
        (
          SELECT array_agg(mapped.value ORDER BY mapped.first_position)
          FROM (
            SELECT CASE
                     WHEN tag LIKE $1 THEN $3 || substring(tag FROM length($2) + 1)
                     ELSE tag
                   END AS value,
                   MIN(position) AS first_position
            FROM unnest(item.tags) WITH ORDINALITY AS source(tag, position)
            WHERE tag IS NOT NULL
              AND (tag NOT LIKE $1 OR $3 IS NOT NULL)
            GROUP BY CASE
                       WHEN tag LIKE $1 THEN $3 || substring(tag FROM length($2) + 1)
                       ELSE tag
                     END
          ) AS mapped
        ),
        ARRAY[]::text[]
      ),
      "updatedAt" = now()
      WHERE EXISTS (
        SELECT 1
        FROM unnest(item.tags) AS source(tag)
        WHERE tag LIKE $1
      )
      `,
      [pattern, prefix, nextPrefix],
    );
  }

  private async ensureTagUnderCategory(
    category: TagCategoryEntity,
    label: string,
  ): Promise<TaxonomyTagEntity> {
    const trimmed = label.trim();
    const slug = slugify(trimmed);
    if (!slug) {
      throw new BadRequestException("Tag label is invalid after slugify");
    }

    const existing = await this.tags.findOne({
      where: { categoryId: category.id, slug },
    });
    if (existing) return existing;

    return this.tags.save(
      this.tags.create({
        categoryId: category.id,
        slug,
        label: trimmed || humanizeSlug(slug),
        builtIn: false,
        sortOrder: await this.nextTagSortOrder(category.id),
      }),
    );
  }

  /**
   * Rewrite `sortOrder` so GET /taxonomy returns the requested sequence.
   * Unknown slugs 400; omitted slugs keep relative order at the end.
   */
  async reorder(dto: ReorderTaxonomyDto): Promise<TaxonomyCategoryDto[]> {
    if (!dto.categorySlugs?.length && !dto.tags?.length) {
      throw new BadRequestException("Provide categorySlugs or tags to reorder");
    }

    if (dto.categorySlugs?.length) {
      const existing = await this.categories.find({
        order: { sortOrder: "ASC", label: "ASC" },
      });
      const ordered = applyRequestedOrder(
        existing,
        dto.categorySlugs,
        "category",
      );
      await this.categories.save(ordered);
    }

    for (const group of dto.tags ?? []) {
      const category = await this.requireCategory(group.categorySlug);
      const existing = await this.tags.find({
        where: { categoryId: category.id },
        order: { sortOrder: "ASC", label: "ASC" },
      });
      const ordered = applyRequestedOrder(existing, group.tagSlugs, "tag");
      await this.tags.save(ordered);
    }

    return this.list();
  }

  private async nextCategorySortOrder(): Promise<number> {
    return nextSortStep(await this.categories.find({ select: ["sortOrder"] }));
  }

  private async nextTagSortOrder(categoryId: string): Promise<number> {
    return nextSortStep(
      await this.tags.find({
        where: { categoryId },
        select: ["sortOrder"],
      }),
    );
  }

  private async getCategoryDto(slug: string): Promise<TaxonomyCategoryDto> {
    const [category, counts] = await Promise.all([
      this.categories.findOne({
        where: { slug },
        relations: { tags: true },
        order: { tags: { sortOrder: "ASC", label: "ASC" } },
      }),
      this.usageCounts(),
    ]);
    if (!category) {
      throw new NotFoundException(`Category “${slug}” not found`);
    }
    return {
      slug: category.slug,
      label: category.label,
      builtIn: category.builtIn,
      tags: (category.tags ?? []).map((tag) =>
        this.toTagDto(category.slug, tag, counts),
      ),
    };
  }

  private toTagDto(
    categorySlug: string,
    tag: TaxonomyTagEntity,
    counts: Map<string, number>,
  ): TaxonomyTagDto {
    const key = `${categorySlug}:${tag.slug}`;
    return {
      slug: tag.slug,
      label: tag.label,
      builtIn: tag.builtIn,
      count: counts.get(key) ?? 0,
    };
  }

  /** Usage counts for encoded tags on archive items. */
  private async usageCounts(): Promise<Map<string, number>> {
    const rows: unknown = await this.archiveItems.query(
      `
      SELECT t.tag AS tag, COUNT(*)::int AS count
      FROM archive_items item
      CROSS JOIN LATERAL unnest(item.tags) AS t(tag)
      GROUP BY t.tag
      `,
    );

    const map = new Map<string, number>();
    if (!Array.isArray(rows)) return map;

    for (const row of rows) {
      const record =
        row !== null && typeof row === "object"
          ? (row as Record<string, unknown>)
          : {};
      const tag =
        typeof record.tag === "string" || typeof record.tag === "number"
          ? String(record.tag)
          : "";
      if (!tag) continue;
      map.set(tag, Number(record.count ?? 0));
    }
    return map;
  }
}

const SORT_STEP = 10;

function nextSortStep(rows: { sortOrder: number }[]): number {
  const max = rows.reduce(
    (highest, row) => Math.max(highest, row.sortOrder),
    0,
  );
  return max + SORT_STEP;
}

function applyRequestedOrder<T extends { slug: string; sortOrder: number }>(
  existing: T[],
  requestedSlugs: string[],
  kind: "category" | "tag",
): T[] {
  const bySlug = new Map(existing.map((row) => [row.slug, row]));
  const seen = new Set<string>();
  const ordered: T[] = [];

  for (const raw of requestedSlugs) {
    const slug = slugify(raw);
    if (!slug) {
      throw new BadRequestException(`Invalid ${kind} slug`);
    }
    const row = bySlug.get(slug);
    if (!row) {
      throw new BadRequestException(`Unknown ${kind} “${slug}”`);
    }
    if (seen.has(slug)) {
      throw new BadRequestException(`Duplicate ${kind} “${slug}”`);
    }
    seen.add(slug);
    ordered.push(row);
  }

  for (const row of existing) {
    if (!seen.has(row.slug)) ordered.push(row);
  }

  return ordered.map((row, index) => {
    row.sortOrder = (index + 1) * SORT_STEP;
    return row;
  });
}

function parseEncodedTag(
  value: string,
): { categorySlug: string; tagSlug: string } | null {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  const colon = raw.indexOf(":");
  if (colon <= 0 || colon !== raw.lastIndexOf(":")) return null;
  const categorySlug = raw.slice(0, colon);
  const tagSlug = raw.slice(colon + 1);
  if (!categorySlug || !tagSlug) return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(categorySlug)) return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tagSlug)) return null;
  return { categorySlug, tagSlug };
}
