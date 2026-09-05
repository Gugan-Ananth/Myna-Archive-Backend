import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BunnyService } from "../media/bunny.service";
import { ImagePreviewService } from "../media/image-preview.service";
import { TaxonomyService } from "../taxonomy/taxonomy.service";
import { ArchiveItemsService } from "./archive-items.service";
import { ArchiveItemEntity } from "./entities/archive-item.entity";

describe("ArchiveItemsService", () => {
  let service: ArchiveItemsService;

  const repository = {
    create: jest.fn((entity: Partial<ArchiveItemEntity>) => entity),
    save: jest.fn((entity: Partial<ArchiveItemEntity>) =>
      Promise.resolve({
        id: "11111111-1111-1111-1111-111111111111",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...entity,
      } as ArchiveItemEntity),
    ),
    findOne: jest.fn(),
    find: jest.fn(() => Promise.resolve([])),
    remove: jest.fn(() => Promise.resolve(undefined)),
    createQueryBuilder: jest.fn(() => {
      const qb: Record<string, jest.Mock> = {};
      const chain = () => qb;
      qb.select = jest.fn(chain);
      qb.addSelect = jest.fn(chain);
      qb.where = jest.fn(chain);
      qb.andWhere = jest.fn(chain);
      qb.groupBy = jest.fn(chain);
      qb.orderBy = jest.fn(chain);
      qb.addOrderBy = jest.fn(chain);
      qb.skip = jest.fn(chain);
      qb.take = jest.fn(chain);
      qb.getCount = jest.fn(() => Promise.resolve(0));
      qb.getMany = jest.fn(() => Promise.resolve([]));
      qb.getRawMany = jest.fn(() => Promise.resolve([]));
      qb.getRawAndEntities = jest.fn(() =>
        Promise.resolve({ entities: [], raw: [] }),
      );
      return qb;
    }),
  };

  const bunny = {
    verifyAndDeriveUrls: jest.fn(),
    destroy: jest.fn(() => Promise.resolve(undefined)),
  };

  const taxonomy = {
    ensureEncodedTags: jest.fn(() => Promise.resolve(undefined)),
  };

  const previews = {
    thumbnailUrlFor: jest.fn((_id: string, fallback: string) =>
      Promise.resolve(fallback),
    ),
    destroyForOriginal: jest.fn(() => Promise.resolve(undefined)),
  };

  function mockImageVerify(publicId: string) {
    return {
      resource: {
        publicId,
        resourceType: "image" as const,
        bytes: 1000,
        format: "jpg",
      },
      urls: {
        mediaUrl: `https://cdn.example.b-cdn.net/${publicId}`,
        thumbnailUrl: `https://cdn.example.b-cdn.net/${publicId}?width=480&quality=68&format=webp`,
      },
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveItemsService,
        {
          provide: getRepositoryToken(ArchiveItemEntity),
          useValue: repository,
        },
        { provide: BunnyService, useValue: bunny },
        { provide: ImagePreviewService, useValue: previews },
        { provide: TaxonomyService, useValue: taxonomy },
      ],
    }).compile();

    service = module.get(ArchiveItemsService);
  });

  describe("create", () => {
    it("creates a single-image item via legacy fields and synthesizes mediaAssets", async () => {
      bunny.verifyAndDeriveUrls.mockResolvedValue(
        mockImageVerify("myna-archive/abc.jpg"),
      );

      const result = await service.create({
        publicId: "myna-archive/abc.jpg",
        resourceType: "image",
        mediaType: "image",
        name: "Misty Lake",
        tags: ["#Landscape", "fog"],
        rating: 9.5,
        description: "Morning fog",
        width: 1920,
        height: 1080,
        blurHash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
      });

      expect(bunny.verifyAndDeriveUrls).toHaveBeenCalledTimes(1);
      expect(result.name).toBe("Misty Lake");
      expect(result.tags).toEqual(["landscape", "fog"]);
      expect(result.mediaType).toBe("image");
      expect(result.mediaUrl).toContain("b-cdn.net");
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.blurHash).toBe("LEHV6nWB2yk8pyo0adR*.7kCMdnj");
      expect(result.mediaAssets).toHaveLength(1);
      expect(result.mediaAssets[0]?.publicId).toBe("myna-archive/abc.jpg");
    });

    it("creates an image group from assets[] (cover = first)", async () => {
      bunny.verifyAndDeriveUrls.mockImplementation(
        (params: { publicId: string }) =>
          Promise.resolve(mockImageVerify(params.publicId)),
      );

      const result = await service.create({
        mediaType: "image",
        name: "Coast set",
        tags: ["ocean"],
        rating: 8,
        assets: [
          {
            publicId: "myna-archive/a.jpg",
            resourceType: "image",
            width: 1000,
            height: 1500,
            blurHash: "LGF5]+Yk^6#M@-5c,1J5@[or[Q6.",
          },
          {
            publicId: "myna-archive/b.jpg",
            resourceType: "image",
            width: 800,
            height: 600,
          },
          {
            publicId: "myna-archive/c.jpg",
            resourceType: "image",
          },
        ],
      });

      expect(bunny.verifyAndDeriveUrls).toHaveBeenCalledTimes(3);
      expect(result.mediaAssets).toHaveLength(3);
      expect(result.mediaUrl).toContain("myna-archive/a.jpg");
      expect(result.thumbnailUrl).toContain("myna-archive/a.jpg");
      expect(result.width).toBe(1000);
      expect(result.height).toBe(1500);
      expect(result.blurHash).toBe("LGF5]+Yk^6#M@-5c,1J5@[or[Q6.");
      expect(result.mediaAssets[1]?.width).toBe(800);
      expect(result.mediaAssets[2]?.width).toBeNull();

      const createArg = repository.create.mock.calls[0]?.[0] as {
        publicId: string;
        mediaAssets: Array<{ publicId: string }>;
      };
      expect(createArg.publicId).toBe("myna-archive/a.jpg");
      expect(createArg.mediaAssets.map((a) => a.publicId)).toEqual([
        "myna-archive/a.jpg",
        "myna-archive/b.jpg",
        "myna-archive/c.jpg",
      ]);
    });

    it("creates a Cute Things item as a separate single-image section", async () => {
      bunny.verifyAndDeriveUrls.mockResolvedValue(
        mockImageVerify("myna-archive/cute.jpg"),
      );

      const result = await service.create({
        mediaType: "image",
        section: "cute-things",
        name: "Cute cat",
        tags: ["animals"],
        rating: 9,
        assets: [
          { publicId: "myna-archive/cute.jpg", resourceType: "image" },
        ],
      });

      expect(result.section).toBe("cute-things");
      expect(result.mediaAssets).toHaveLength(1);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ section: "cute-things" }),
      );
    });

    it("rejects Cute Things items with multiple images", async () => {
      await expect(
        service.create({
          mediaType: "image",
          section: "cute-things",
          name: "Too much cute",
          tags: ["animals"],
          rating: 9,
          assets: [
            { publicId: "myna-archive/cute-1.jpg", resourceType: "image" },
            { publicId: "myna-archive/cute-2.jpg", resourceType: "image" },
          ],
        }),
      ).rejects.toThrow("Cute-things items must have exactly one image");

      expect(bunny.verifyAndDeriveUrls).not.toHaveBeenCalled();
    });

    it("creates a written story and binds inline images in document order", async () => {
      bunny.verifyAndDeriveUrls.mockImplementation(
        (params: { publicId: string }) =>
          Promise.resolve(mockImageVerify(params.publicId)),
      );

      const result = await service.create({
        mediaType: "story",
        name: "Night letter",
        author: "  Ada Lovelace  ",
        tags: ["bondage:hogtie"],
        rating: 8,
        bodyHtml:
          '<p>before</p><img src="data:image/png;base64,aaa"><p>mid</p><img src="data:image/png;base64,bbb"><p>after</p>',
        assets: [
          { publicId: "myna-archive/s1.jpg", resourceType: "image" },
          { publicId: "myna-archive/s2.jpg", resourceType: "image" },
        ],
      });

      expect(result.mediaType).toBe("story");
      expect(result.author).toBe("Ada Lovelace");
      expect(result.mediaAssets).toHaveLength(2);
      expect(result.bodyHtml).toContain("<p>before</p>");
      expect(result.bodyHtml).toContain("<p>mid</p>");
      expect(result.bodyHtml).toContain("<p>after</p>");
      expect(result.bodyHtml.indexOf("s1.jpg")).toBeLessThan(
        result.bodyHtml.indexOf("s2.jpg"),
      );
      expect(result.bodyHtml).not.toContain("data:image");
    });

    it("creates a text-only story without media assets", async () => {
      const result = await service.create({
        mediaType: "story",
        name: "Note",
        tags: ["x"],
        rating: 5,
        bodyHtml: "<p>hello</p>",
      });

      expect(bunny.verifyAndDeriveUrls).not.toHaveBeenCalled();
      expect(result.mediaType).toBe("story");
      expect(result.mediaAssets).toEqual([]);
      expect(result.characters).toEqual([]);
      expect(result.bodyHtml).toContain("<p>hello</p>");
      expect(result.mediaUrl).toBe("");
    });

    it("stores named story characters and verifies optional portraits", async () => {
      bunny.verifyAndDeriveUrls.mockImplementation(
        (params: { publicId: string }) =>
          Promise.resolve(mockImageVerify(params.publicId)),
      );

      const result = await service.create({
        mediaType: "story",
        name: "Night letter",
        tags: ["x"],
        rating: 8,
        bodyHtml: '<p>Suki: "hello"</p>',
        characters: [
          { name: "  Suki  ", publicId: "myna-archive/suki.jpg" },
          { name: "Lara" },
        ],
      });

      expect(bunny.verifyAndDeriveUrls).toHaveBeenCalledTimes(1);
      expect(result.characters).toEqual([
        expect.objectContaining({
          name: "Suki",
          publicId: "myna-archive/suki.jpg",
          mediaUrl: expect.stringContaining("suki.jpg"),
        }),
        {
          name: "Lara",
          publicId: null,
          mediaUrl: "",
          thumbnailUrl: "",
          width: null,
          height: null,
          blurHash: null,
        },
      ]);
      expect(result.mediaAssets).toEqual([]);
    });

    it("rejects duplicate story character names", async () => {
      await expect(
        service.create({
          mediaType: "story",
          name: "Dup",
          tags: ["x"],
          rating: 1,
          bodyHtml: "<p>hi</p>",
          characters: [{ name: "Suki" }, { name: "suki" }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(bunny.verifyAndDeriveUrls).not.toHaveBeenCalled();
    });

    it("rejects characters on non-story items", async () => {
      await expect(
        service.create({
          mediaType: "image",
          name: "Nope",
          tags: ["x"],
          rating: 1,
          publicId: "myna-archive/a.jpg",
          resourceType: "image",
          characters: [{ name: "Suki" }],
        }),
      ).rejects.toThrow("Only stories can have characters");
      expect(bunny.verifyAndDeriveUrls).not.toHaveBeenCalled();
    });

    it("treats an extra leading asset as an optional story cover", async () => {
      bunny.verifyAndDeriveUrls.mockImplementation(
        (params: { publicId: string }) =>
          Promise.resolve(mockImageVerify(params.publicId)),
      );

      const result = await service.create({
        mediaType: "story",
        name: "Covered letter",
        tags: ["x"],
        rating: 7,
        bodyHtml: '<p>hi</p><img src="data:image/png;base64,aaa">',
        assets: [
          { publicId: "myna-archive/cover.jpg", resourceType: "image" },
          { publicId: "myna-archive/inline.jpg", resourceType: "image" },
        ],
      });

      expect(result.mediaAssets).toHaveLength(2);
      expect(result.mediaUrl).toContain("cover.jpg");
      expect(result.bodyHtml).toContain("inline.jpg");
      expect(result.bodyHtml).not.toContain("cover.jpg");
    });

    it("creates a cover-only story with no inline images", async () => {
      bunny.verifyAndDeriveUrls.mockImplementation(
        (params: { publicId: string }) =>
          Promise.resolve(mockImageVerify(params.publicId)),
      );

      const result = await service.create({
        mediaType: "story",
        name: "Cover only",
        tags: ["x"],
        rating: 5,
        bodyHtml: "<p>hello</p>",
        assets: [
          { publicId: "myna-archive/cover.jpg", resourceType: "image" },
        ],
      });

      expect(result.mediaAssets).toHaveLength(1);
      expect(result.mediaUrl).toContain("cover.jpg");
      expect(result.bodyHtml).toContain("<p>hello</p>");
      expect(result.bodyHtml).not.toContain("cover.jpg");
    });

    it("rejects stories whose image count does not match assets", async () => {
      await expect(
        service.create({
          mediaType: "story",
          name: "Mismatch",
          tags: ["x"],
          rating: 1,
          bodyHtml: "<p>no images</p>",
          assets: [
            { publicId: "myna-archive/s1.jpg", resourceType: "image" },
            { publicId: "myna-archive/s2.jpg", resourceType: "image" },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects image groups with more than 25 assets", async () => {
      const assets = Array.from({ length: 26 }, (_, i) => ({
        publicId: `myna-archive/${i}.jpg`,
        resourceType: "image" as const,
      }));

      await expect(
        service.create({
          mediaType: "image",
          name: "too many",
          tags: ["x"],
          rating: 1,
          assets,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(bunny.verifyAndDeriveUrls).not.toHaveBeenCalled();
    });

    it("creates a comic with more than 10 pages (cover = first)", async () => {
      bunny.verifyAndDeriveUrls.mockImplementation(
        (params: { publicId: string }) =>
          Promise.resolve(mockImageVerify(params.publicId)),
      );

      const assets = Array.from({ length: 12 }, (_, i) => ({
        publicId: `myna-archive/p${i + 1}.jpg`,
        resourceType: "image" as const,
        width: 800,
        height: 1200,
      }));

      const result = await service.create({
        mediaType: "comic",
        name: "Night issue",
        tags: ["bondage:hogtie"],
        rating: 9,
        assets,
      });

      expect(bunny.verifyAndDeriveUrls).toHaveBeenCalledTimes(12);
      expect(result.mediaType).toBe("comic");
      expect(result.mediaAssets).toHaveLength(12);
      expect(result.mediaAssets[0]?.publicId).toBe("myna-archive/p1.jpg");
      expect(result.width).toBe(800);
      expect(result.height).toBe(1200);
    });

    it("rejects comics with more than 80 pages", async () => {
      const assets = Array.from({ length: 81 }, (_, i) => ({
        publicId: `myna-archive/${i}.jpg`,
        resourceType: "image" as const,
      }));

      await expect(
        service.create({
          mediaType: "comic",
          name: "too long",
          tags: ["x"],
          rating: 1,
          assets,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(bunny.verifyAndDeriveUrls).not.toHaveBeenCalled();
    });

    it("rejects mixed video assets on a comic", async () => {
      await expect(
        service.create({
          mediaType: "comic",
          name: "mixed",
          tags: ["x"],
          rating: 1,
          assets: [
            { publicId: "myna-archive/a.jpg", resourceType: "image" },
            { publicId: "vid-guid", resourceType: "video" },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects mixed image/video assets on an image item", async () => {
      await expect(
        service.create({
          mediaType: "image",
          name: "mixed",
          tags: ["x"],
          rating: 1,
          assets: [
            { publicId: "myna-archive/a.jpg", resourceType: "image" },
            { publicId: "vid-guid", resourceType: "video" },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects video items with multiple assets", async () => {
      await expect(
        service.create({
          mediaType: "video",
          name: "clip",
          tags: ["x"],
          rating: 1,
          assets: [
            { publicId: "vid-1", resourceType: "video" },
            { publicId: "vid-2", resourceType: "video" },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects duplicate publicIds in assets", async () => {
      await expect(
        service.create({
          mediaType: "image",
          name: "dup",
          tags: ["x"],
          rating: 1,
          assets: [
            { publicId: "myna-archive/same.jpg", resourceType: "image" },
            { publicId: "myna-archive/same.jpg", resourceType: "image" },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects width without height on an asset", async () => {
      await expect(
        service.create({
          mediaType: "image",
          name: "dims",
          tags: ["x"],
          rating: 1,
          assets: [
            {
              publicId: "myna-archive/a.jpg",
              resourceType: "image",
              width: 100,
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects when tags normalize to empty", async () => {
      await expect(
        service.create({
          publicId: "myna-archive/abc.jpg",
          resourceType: "image",
          mediaType: "image",
          name: "x",
          tags: ["#", "  "],
          rating: 5,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("creates video with Stream dimensions preferred over client", async () => {
      bunny.verifyAndDeriveUrls.mockResolvedValue({
        resource: {
          publicId: "video-guid",
          resourceType: "video",
          bytes: 5_000_000,
          format: "mp4",
          width: 1920,
          height: 1080,
          status: 4,
        },
        urls: {
          mediaUrl: "https://stream.example.b-cdn.net/video-guid/play_720p.mp4",
          thumbnailUrl:
            "https://stream.example.b-cdn.net/video-guid/thumbnail.jpg",
        },
      });

      const result = await service.create({
        mediaType: "video",
        name: "Wave",
        tags: ["sea"],
        rating: 7,
        assets: [
          {
            publicId: "video-guid",
            resourceType: "video",
            width: 640,
            height: 360,
          },
        ],
      });

      expect(result.mediaType).toBe("video");
      expect(result.mediaAssets).toHaveLength(1);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });
  });

  describe("findOne", () => {
    it("throws NotFound when missing", async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(
        service.findOne("11111111-1111-1111-1111-111111111111"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("synthesizes mediaAssets for legacy rows without JSONB", async () => {
      repository.findOne.mockResolvedValue({
        id: "11111111-1111-1111-1111-111111111111",
        publicId: "myna-archive/old.jpg",
        resourceType: "image",
        name: "Legacy",
        description: "",
        tags: ["old"],
        rating: 5,
        mediaType: "image",
        thumbnailUrl: "https://cdn.example/old.jpg?w=1",
        mediaUrl: "https://cdn.example/old.jpg",
        width: null,
        height: null,
        blurHash: null,
        mediaAssets: null,
      });

      const result = await service.findOne(
        "11111111-1111-1111-1111-111111111111",
      );
      expect(result.mediaAssets).toHaveLength(1);
      expect(result.mediaAssets[0]?.publicId).toBe("myna-archive/old.jpg");
    });
  });

  describe("findAll", () => {
    it("uses the indexed asset count and reads the total in the page query", async () => {
      const qb = repository.createQueryBuilder();
      qb.getRawAndEntities.mockResolvedValue({
        entities: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            name: "Single image",
            description: "",
            author: "",
            summary: "",
            tags: ["images"],
            rating: 8,
            mediaType: "image",
            starred: false,
            section: "images",
            seriesId: null,
            chapterNumber: 1,
            thumbnailUrl: "thumb",
            mediaUrl: "media",
            width: 100,
            height: 100,
            blurHash: null,
            publicId: "myna-archive/single.jpg",
            resourceType: "image",
            mediaAssets: null,
          } as ArchiveItemEntity,
        ],
        raw: [{ total_count: "41" }],
      });
      repository.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.findAll({
        mediaType: "image",
        section: "images",
        imageGroup: false,
        page: 1,
        pageSize: 40,
      });

      expect(qb.andWhere).toHaveBeenCalledWith("item.mediaAssetCount <= 1");
      expect(qb.addSelect).toHaveBeenCalledWith(
        "COUNT(*) OVER()",
        "total_count",
      );
      expect(qb.getCount).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 40,
        total: 41,
        totalPages: 2,
      });
    });
  });

  describe("update", () => {
    it("updates the author of a story", async () => {
      const entity = {
        id: "11111111-1111-1111-1111-111111111111",
        publicId: "",
        resourceType: "image",
        name: "Story",
        description: "",
        author: "Old Author",
        bodyHtml: "<p>hello</p>",
        summary: "",
        tags: ["x"],
        rating: 5,
        mediaType: "story",
        seriesId: null,
        chapterNumber: 1,
        thumbnailUrl: "",
        mediaUrl: "",
        width: null,
        height: null,
        blurHash: null,
        mediaAssets: [],
        characters: [],
      } as ArchiveItemEntity;
      repository.findOne.mockResolvedValue(entity);

      const result = await service.update(entity.id, {
        author: "  New Author  ",
      });

      expect(result.author).toBe("New Author");
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ author: "New Author" }),
      );
    });

    it("replaces story characters and destroys unused portraits", async () => {
      bunny.verifyAndDeriveUrls.mockImplementation(
        (params: { publicId: string }) =>
          Promise.resolve(mockImageVerify(params.publicId)),
      );
      const entity = {
        id: "11111111-1111-1111-1111-111111111111",
        publicId: "",
        resourceType: "image",
        name: "Story",
        description: "",
        author: "",
        bodyHtml: "<p>hello</p>",
        summary: "",
        tags: ["x"],
        rating: 5,
        mediaType: "story",
        seriesId: null,
        chapterNumber: 1,
        thumbnailUrl: "",
        mediaUrl: "",
        width: null,
        height: null,
        blurHash: null,
        mediaAssets: [],
        characters: [
          {
            name: "Suki",
            publicId: "myna-archive/suki-old.jpg",
            mediaUrl: "https://cdn.example/suki-old.jpg",
            thumbnailUrl: "https://cdn.example/suki-old.jpg?w=1",
            width: null,
            height: null,
            blurHash: null,
          },
        ],
      } as ArchiveItemEntity;
      repository.findOne.mockResolvedValue(entity);

      const result = await service.update(entity.id, {
        characters: [{ name: "Suki", publicId: "myna-archive/suki-new.jpg" }],
      });

      expect(result.characters[0]?.publicId).toBe("myna-archive/suki-new.jpg");
      expect(bunny.destroy).toHaveBeenCalledWith(
        "myna-archive/suki-old.jpg",
        "image",
      );
    });

    it("stars an image when its category has room", async () => {
      const entity = {
        id: "11111111-1111-1111-1111-111111111111",
        publicId: "myna-archive/star.jpg",
        resourceType: "image",
        name: "Starred image",
        description: "",
        author: "",
        bodyHtml: "",
        summary: "",
        tags: ["x"],
        rating: 5,
        mediaType: "image",
        starred: false,
        section: "images",
        seriesId: null,
        chapterNumber: 1,
        thumbnailUrl: "thumb",
        mediaUrl: "media",
        width: 100,
        height: 100,
        blurHash: null,
        mediaAssets: [],
        characters: [],
      } as ArchiveItemEntity;
      repository.findOne.mockResolvedValue(entity);

      const result = await service.update(entity.id, { starred: true });

      expect(result.starred).toBe(true);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ starred: true }),
      );
    });

    it("rejects a star when the category already has ten items", async () => {
      const entity = {
        id: "11111111-1111-1111-1111-111111111111",
        publicId: "myna-archive/star.jpg",
        resourceType: "image",
        name: "Starred image",
        description: "",
        author: "",
        bodyHtml: "",
        summary: "",
        tags: ["x"],
        rating: 5,
        mediaType: "image",
        starred: false,
        section: "images",
        seriesId: null,
        chapterNumber: 1,
        thumbnailUrl: "thumb",
        mediaUrl: "media",
        width: 100,
        height: 100,
        blurHash: null,
        mediaAssets: [],
        characters: [],
      } as ArchiveItemEntity;
      repository.findOne.mockResolvedValue(entity);

      const qb: Record<string, jest.Mock> = {};
      const chain = () => qb;
      qb.where = jest.fn(chain);
      qb.andWhere = jest.fn(chain);
      qb.getCount = jest.fn(() => Promise.resolve(10));
      repository.createQueryBuilder.mockReturnValueOnce(qb);

      await expect(service.update(entity.id, { starred: true })).rejects.toThrow(
        "You can star a maximum of 10 items in the images category",
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("destroys every Bunny asset in an image group then deletes row", async () => {
      repository.findOne.mockResolvedValue({
        id: "11111111-1111-1111-1111-111111111111",
        publicId: "myna-archive/a.jpg",
        resourceType: "image",
        name: "group",
        description: "",
        tags: ["a"],
        rating: 1,
        mediaType: "image",
        thumbnailUrl: "t",
        mediaUrl: "m",
        width: null,
        height: null,
        blurHash: null,
        mediaAssets: [
          {
            publicId: "myna-archive/a.jpg",
            resourceType: "image",
            mediaUrl: "m1",
            thumbnailUrl: "t1",
            width: null,
            height: null,
            blurHash: null,
          },
          {
            publicId: "myna-archive/b.jpg",
            resourceType: "image",
            mediaUrl: "m2",
            thumbnailUrl: "t2",
            width: null,
            height: null,
            blurHash: null,
          },
        ],
      });

      await service.remove("11111111-1111-1111-1111-111111111111");

      expect(bunny.destroy).toHaveBeenCalledTimes(2);
      expect(bunny.destroy).toHaveBeenCalledWith("myna-archive/a.jpg", "image");
      expect(bunny.destroy).toHaveBeenCalledWith("myna-archive/b.jpg", "image");
      expect(repository.remove).toHaveBeenCalled();
    });

    it("destroys story character portraits with the chapter", async () => {
      repository.findOne.mockResolvedValue({
        id: "11111111-1111-1111-1111-111111111111",
        publicId: "",
        resourceType: "image",
        name: "chapter",
        description: "",
        tags: ["a"],
        rating: 1,
        mediaType: "story",
        seriesId: null,
        chapterNumber: 1,
        thumbnailUrl: "",
        mediaUrl: "",
        width: null,
        height: null,
        blurHash: null,
        mediaAssets: [],
        characters: [
          {
            name: "Suki",
            publicId: "myna-archive/suki.jpg",
            mediaUrl: "m",
            thumbnailUrl: "t",
            width: null,
            height: null,
            blurHash: null,
          },
        ],
      });
      repository.find.mockResolvedValue([]);

      await service.remove("11111111-1111-1111-1111-111111111111");

      expect(bunny.destroy).toHaveBeenCalledWith(
        "myna-archive/suki.jpg",
        "image",
      );
      expect(repository.remove).toHaveBeenCalled();
    });

    it("destroys cover asset for legacy single-image rows", async () => {
      repository.findOne.mockResolvedValue({
        id: "11111111-1111-1111-1111-111111111111",
        publicId: "myna-archive/abc.jpg",
        resourceType: "image",
        name: "x",
        description: "",
        tags: ["a"],
        rating: 1,
        mediaType: "image",
        thumbnailUrl: "t",
        mediaUrl: "m",
        mediaAssets: null,
      });

      await service.remove("11111111-1111-1111-1111-111111111111");

      expect(bunny.destroy).toHaveBeenCalledWith(
        "myna-archive/abc.jpg",
        "image",
      );
      expect(repository.remove).toHaveBeenCalled();
    });

    it("deletes a later story chapter without removing the series", async () => {
      repository.findOne.mockResolvedValue({
        id: "22222222-2222-2222-2222-222222222222",
        publicId: "",
        resourceType: "image",
        name: "test",
        description: "",
        tags: ["x"],
        rating: 5,
        mediaType: "story",
        seriesId: "11111111-1111-1111-1111-111111111111",
        chapterNumber: 2,
        thumbnailUrl: "",
        mediaUrl: "",
        mediaAssets: [],
      });

      await service.remove("22222222-2222-2222-2222-222222222222");

      expect(repository.remove).toHaveBeenCalledTimes(1);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it("promotes the next chapter to root when chapter 1 is deleted", async () => {
      const root = {
        id: "11111111-1111-1111-1111-111111111111",
        publicId: "",
        resourceType: "image",
        name: "Night letter",
        description: "",
        tags: ["x"],
        rating: 8,
        mediaType: "story",
        seriesId: null,
        chapterNumber: 1,
        thumbnailUrl: "",
        mediaUrl: "",
        mediaAssets: [],
      };
      const chapter2 = {
        id: "22222222-2222-2222-2222-222222222222",
        name: "Night letter",
        mediaType: "story",
        seriesId: root.id,
        chapterNumber: 2,
        mediaAssets: [],
      };
      const chapter3 = {
        id: "33333333-3333-3333-3333-333333333333",
        name: "Night letter",
        mediaType: "story",
        seriesId: root.id,
        chapterNumber: 3,
        mediaAssets: [],
      };
      repository.findOne.mockResolvedValue(root);
      repository.find.mockResolvedValue([chapter3, chapter2]);

      await service.remove(root.id);

      expect(repository.remove).toHaveBeenCalledTimes(1);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: chapter2.id,
          seriesId: null,
          name: "Night letter",
          chapterNumber: 2,
        }),
      );
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: chapter3.id,
          seriesId: chapter2.id,
        }),
      );
    });
  });
});
