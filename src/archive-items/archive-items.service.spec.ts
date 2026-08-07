import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BunnyService } from "../media/bunny.service";
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
    remove: jest.fn(() => Promise.resolve(undefined)),
    createQueryBuilder: jest.fn(),
  };

  const bunny = {
    verifyAndDeriveUrls: jest.fn(),
    destroy: jest.fn(() => Promise.resolve(undefined)),
  };

  const taxonomy = {
    ensureEncodedTags: jest.fn(() => Promise.resolve(undefined)),
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
        thumbnailUrl: `https://cdn.example.b-cdn.net/${publicId}?width=480&height=270`,
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

    it("rejects image groups with more than 10 assets", async () => {
      const assets = Array.from({ length: 11 }, (_, i) => ({
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
  });
});
