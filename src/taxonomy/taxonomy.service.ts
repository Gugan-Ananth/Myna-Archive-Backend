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

  /** Ensure seed categories/tags exist (idempotent). */
  async seedBuiltIns(): Promise<void> {
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
    const categories = await this.categories.find({
      relations: { tags: true },
      order: {
        sortOrder: "ASC",
        label: "ASC",
        tags: { sortOrder: "ASC", label: "ASC" },
      },
    });

    const counts = await this.usageCounts();

    return categories.map((cat) => ({
      slug: cat.slug,
      label: cat.label,
      builtIn: cat.builtIn,
      tags: (cat.tags ?? []).map((tag) =>
        this.toTagDto(cat.slug, tag, counts),
      ),
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
          sortOrder: 500,
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
            sortOrder: 500,
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
            sortOrder: 500,
          }),
        );
      }
    }
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
        sortOrder: 500,
      }),
    );
  }

  private async getCategoryDto(slug: string): Promise<TaxonomyCategoryDto> {
    const category = await this.categories.findOne({
      where: { slug },
      relations: { tags: true },
      order: { tags: { sortOrder: "ASC", label: "ASC" } },
    });
    if (!category) {
      throw new NotFoundException(`Category “${slug}” not found`);
    }
    const counts = await this.usageCounts();
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
