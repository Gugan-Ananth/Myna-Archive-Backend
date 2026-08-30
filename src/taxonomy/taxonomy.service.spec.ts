import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ArchiveItemEntity } from "../archive-items/entities/archive-item.entity";
import { TagCategoryEntity } from "./entities/tag-category.entity";
import { TaxonomyTagEntity } from "./entities/taxonomy-tag.entity";
import { TaxonomyService } from "./taxonomy.service";

type CategoryRow = {
  id: string;
  slug: string;
  label: string;
  builtIn: boolean;
  sortOrder: number;
};

type TagRow = {
  id: string;
  categoryId: string;
  slug: string;
  label: string;
  builtIn: boolean;
  sortOrder: number;
};

describe("TaxonomyService.reorder", () => {
  let service: TaxonomyService;
  let categoriesStore: CategoryRow[];
  let tagsStore: TagRow[];

  const categories = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((row: Partial<CategoryRow>) => row),
    count: jest.fn(),
    remove: jest.fn(),
  };

  const tags = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((row: Partial<TagRow>) => row),
    remove: jest.fn(),
  };

  const archiveItems = {
    query: jest.fn(() => Promise.resolve([])),
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    categoriesStore = [
      {
        id: "c-bondage",
        slug: "bondage",
        label: "Bondage",
        builtIn: true,
        sortOrder: 10,
      },
      {
        id: "c-artists",
        slug: "artists",
        label: "Artists",
        builtIn: true,
        sortOrder: 20,
      },
    ];
    tagsStore = [
      {
        id: "t-hogtie",
        categoryId: "c-bondage",
        slug: "hogtie",
        label: "Hogtie",
        builtIn: true,
        sortOrder: 10,
      },
      {
        id: "t-box-tie",
        categoryId: "c-bondage",
        slug: "box-tie",
        label: "Box tie",
        builtIn: true,
        sortOrder: 20,
      },
      {
        id: "t-yuy",
        categoryId: "c-artists",
        slug: "yuy",
        label: "Yuy",
        builtIn: true,
        sortOrder: 10,
      },
    ];

    categories.find.mockImplementation(() =>
      Promise.resolve(
        [...categoriesStore]
          .sort(
            (a, b) =>
              a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
          )
          .map((category) => ({
            ...category,
            tags: tagsStore
              .filter((tag) => tag.categoryId === category.id)
              .sort(
                (a, b) =>
                  a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
              ),
          })),
      ),
    );
    categories.findOne.mockImplementation(
      (opts: { where?: { slug?: string } }) => {
        const slug = opts?.where?.slug;
        const category = categoriesStore.find((row) => row.slug === slug);
        return Promise.resolve(category ? { ...category } : null);
      },
    );
    categories.save.mockImplementation((rows: CategoryRow | CategoryRow[]) => {
      const list = Array.isArray(rows) ? rows : [rows];
      for (const row of list) {
        const index = categoriesStore.findIndex(
          (entry) => entry.id === row.id || entry.slug === row.slug,
        );
        if (index >= 0) {
          categoriesStore[index] = { ...categoriesStore[index], ...row };
        } else {
          categoriesStore.push({ ...row });
        }
      }
      return Promise.resolve(rows);
    });

    tags.find.mockImplementation(
      (opts?: { where?: { categoryId?: string } }) => {
        const categoryId = opts?.where?.categoryId;
        const rows = categoryId
          ? tagsStore.filter((tag) => tag.categoryId === categoryId)
          : tagsStore;
        return Promise.resolve(
          [...rows].sort(
            (a, b) =>
              a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
          ),
        );
      },
    );
    tags.save.mockImplementation((rows: TagRow | TagRow[]) => {
      const list = Array.isArray(rows) ? rows : [rows];
      for (const row of list) {
        const index = tagsStore.findIndex(
          (entry) => entry.id === row.id || entry.slug === row.slug,
        );
        if (index >= 0) {
          tagsStore[index] = { ...tagsStore[index], ...row };
        } else {
          tagsStore.push({ ...row });
        }
      }
      return Promise.resolve(rows);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxonomyService,
        {
          provide: getRepositoryToken(TagCategoryEntity),
          useValue: categories,
        },
        {
          provide: getRepositoryToken(TaxonomyTagEntity),
          useValue: tags,
        },
        {
          provide: getRepositoryToken(ArchiveItemEntity),
          useValue: archiveItems,
        },
      ],
    }).compile();

    service = module.get(TaxonomyService);
  });

  it("writes sequential sortOrder for the given category slugs", async () => {
    const result = await service.reorder({
      categorySlugs: ["artists", "bondage"],
    });

    expect(categoriesStore.map((row) => [row.slug, row.sortOrder])).toEqual([
      ["bondage", 20],
      ["artists", 10],
    ]);
    expect(result.map((category) => category.slug)).toEqual([
      "artists",
      "bondage",
    ]);
  });

  it("keeps omitted categories after the requested order", async () => {
    await service.reorder({ categorySlugs: ["artists"] });

    expect(
      [...categoriesStore]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row) => row.slug),
    ).toEqual(["artists", "bondage"]);
  });

  it("rejects an unknown category slug", async () => {
    await expect(
      service.reorder({ categorySlugs: ["artists", "missing"] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an empty reorder payload", async () => {
    await expect(service.reorder({})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("writes sequential sortOrder for tags in a category", async () => {
    const result = await service.reorder({
      tags: [
        {
          categorySlug: "bondage",
          tagSlugs: ["box-tie", "hogtie"],
        },
      ],
    });

    const bondage = result.find((category) => category.slug === "bondage");
    expect(bondage?.tags.map((tag) => tag.slug)).toEqual(["box-tie", "hogtie"]);
    expect(
      tagsStore
        .filter((tag) => tag.categoryId === "c-bondage")
        .map((tag) => [tag.slug, tag.sortOrder]),
    ).toEqual([
      ["hogtie", 20],
      ["box-tie", 10],
    ]);
  });

  it("does not reorder tags in another category", async () => {
    await service.reorder({
      tags: [{ categorySlug: "bondage", tagSlugs: ["box-tie", "hogtie"] }],
    });

    const yuy = tagsStore.find((tag) => tag.slug === "yuy");
    expect(yuy?.sortOrder).toBe(10);
  });
});
