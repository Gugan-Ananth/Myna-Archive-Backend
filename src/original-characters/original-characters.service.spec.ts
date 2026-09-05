import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BunnyService } from "../media/bunny.service";
import { ImagePreviewService } from "../media/image-preview.service";
import { OriginalCharacterEntity } from "./entities/original-character.entity";
import { OriginalCharactersService } from "./original-characters.service";

describe("OriginalCharactersService", () => {
  let service: OriginalCharactersService;

  const repository = {
    create: jest.fn((entity: Partial<OriginalCharacterEntity>) => entity),
    save: jest.fn((entity: Partial<OriginalCharacterEntity>) =>
      Promise.resolve({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...entity,
      } as OriginalCharacterEntity),
    ),
    findOne: jest.fn(),
    remove: jest.fn(() => Promise.resolve(undefined)),
    createQueryBuilder: jest.fn(),
  };

  const bunny = {
    verifyAndDeriveUrls: jest.fn(),
    destroy: jest.fn(() => Promise.resolve(undefined)),
  };

  const previews = {
    thumbnailUrlFor: jest.fn((_id: string, fallback: string) =>
      Promise.resolve(fallback),
    ),
    destroyForOriginal: jest.fn(() => Promise.resolve(undefined)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    bunny.verifyAndDeriveUrls.mockResolvedValue({
      resource: {
        publicId: "oc/portrait.jpg",
        resourceType: "image",
        bytes: 800,
        format: "jpg",
      },
      urls: {
        mediaUrl: "https://cdn.example.b-cdn.net/oc/portrait.jpg",
        thumbnailUrl:
          "https://cdn.example.b-cdn.net/oc/portrait.jpg?width=480",
      },
    });

    const module = await Test.createTestingModule({
      providers: [
        OriginalCharactersService,
        {
          provide: getRepositoryToken(OriginalCharacterEntity),
          useValue: repository,
        },
        { provide: BunnyService, useValue: bunny },
        { provide: ImagePreviewService, useValue: previews },
      ],
    }).compile();

    service = module.get(OriginalCharactersService);
  });

  it("creates an OC with a verified portrait", async () => {
    const result = await service.create({
      name: "  Mira  ",
      age: "19",
      likes: "tea",
      dislikes: "rain",
      background: "Grew up by the sea.",
      additionalInfo: "Soft-spoken.",
      publicId: "oc/portrait.jpg",
      resourceType: "image",
      width: 800,
      height: 1200,
    });

    expect(bunny.verifyAndDeriveUrls).toHaveBeenCalledWith({
      publicId: "oc/portrait.jpg",
      resourceType: "image",
      mediaType: "image",
    });
    expect(result.name).toBe("Mira");
    expect(result.age).toBe("19");
    expect(result.background).toBe("Grew up by the sea.");
    expect(result.mediaUrl).toContain("portrait.jpg");
  });

  it("rejects a missing name", async () => {
    await expect(
      service.create({
        name: "   ",
        publicId: "oc/portrait.jpg",
        resourceType: "image",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("searches name, background, and additional info", async () => {
    const qb: Record<string, jest.Mock> = {};
    const chain = () => qb;
    qb.andWhere = jest.fn(chain);
    qb.orderBy = jest.fn(chain);
    qb.addOrderBy = jest.fn(chain);
    qb.select = jest.fn(chain);
    qb.addSelect = jest.fn(chain);
    qb.skip = jest.fn(chain);
    qb.take = jest.fn(chain);
    qb.getCount = jest.fn(() => Promise.resolve(1));
    qb.getRawAndEntities = jest.fn(() =>
      Promise.resolve({
        entities: [
          {
            id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            name: "Mira",
            age: "19",
            likes: "",
            dislikes: "",
            background: "Grew up by the sea.",
            additionalInfo: "",
            publicId: "oc/portrait.jpg",
            resourceType: "image",
            mediaUrl: "https://cdn.example.b-cdn.net/oc/portrait.jpg",
            thumbnailUrl: "https://cdn.example.b-cdn.net/oc/portrait.jpg",
            width: 800,
            height: 1200,
            blurHash: null,
          },
        ],
        raw: [{ total_count: "1" }],
      }),
    );
    repository.createQueryBuilder.mockReturnValue(qb);

    const result = await service.findAll({ q: "sea", page: 1, pageSize: 20 });
    expect(qb.andWhere).toHaveBeenCalledWith(
      "(LOWER(oc.name) LIKE :q OR LOWER(oc.background) LIKE :q OR LOWER(oc.additionalInfo) LIKE :q)",
      { q: "%sea%" },
    );
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(qb.getCount).not.toHaveBeenCalled();
    expect(qb.addSelect).toHaveBeenCalledWith("COUNT(*) OVER()", "total_count");
  });

  it("replaces the portrait and deletes the previous asset", async () => {
    repository.findOne.mockResolvedValue({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name: "Mira",
      age: "19",
      likes: "",
      dislikes: "",
      background: "",
      additionalInfo: "",
      publicId: "oc/old.jpg",
      resourceType: "image",
      mediaUrl: "https://cdn.example.b-cdn.net/oc/old.jpg",
      thumbnailUrl: "https://cdn.example.b-cdn.net/oc/old.jpg",
      width: 100,
      height: 100,
      blurHash: null,
    });
    bunny.verifyAndDeriveUrls.mockResolvedValue({
      resource: {
        publicId: "oc/new.jpg",
        resourceType: "image",
        bytes: 800,
        format: "jpg",
      },
      urls: {
        mediaUrl: "https://cdn.example.b-cdn.net/oc/new.jpg",
        thumbnailUrl: "https://cdn.example.b-cdn.net/oc/new.jpg?width=480",
      },
    });

    const result = await service.update(
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      {
        publicId: "oc/new.jpg",
        resourceType: "image",
        width: 600,
        height: 800,
      },
    );

    expect(bunny.destroy).toHaveBeenCalledWith("oc/old.jpg", "image");
    expect(result.publicId).toBe("oc/new.jpg");
  });

  it("stars an OC when its category has room", async () => {
    const entity = {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name: "Mira",
      age: "19",
      likes: "",
      dislikes: "",
      background: "",
      additionalInfo: "",
      publicId: "oc/portrait.jpg",
      resourceType: "image",
      starred: false,
      mediaUrl: "https://cdn.example/portrait.jpg",
      thumbnailUrl: "https://cdn.example/portrait.jpg",
      width: 100,
      height: 100,
      blurHash: null,
    } as OriginalCharacterEntity;
    repository.findOne.mockResolvedValue(entity);

    const qb: Record<string, jest.Mock> = {};
    const chain = () => qb;
    qb.where = jest.fn(chain);
    qb.getCount = jest.fn(() => Promise.resolve(0));
    repository.createQueryBuilder.mockReturnValueOnce(qb);

    const result = await service.update(entity.id, { starred: true });

    expect(result.starred).toBe(true);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ starred: true }),
    );
  });

  it("rejects an OC star when the category already has ten items", async () => {
    const entity = {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name: "Mira",
      age: "19",
      likes: "",
      dislikes: "",
      background: "",
      additionalInfo: "",
      publicId: "oc/portrait.jpg",
      resourceType: "image",
      starred: false,
      mediaUrl: "https://cdn.example/portrait.jpg",
      thumbnailUrl: "https://cdn.example/portrait.jpg",
      width: 100,
      height: 100,
      blurHash: null,
    } as OriginalCharacterEntity;
    repository.findOne.mockResolvedValue(entity);

    const qb: Record<string, jest.Mock> = {};
    const chain = () => qb;
    qb.where = jest.fn(chain);
    qb.getCount = jest.fn(() => Promise.resolve(10));
    repository.createQueryBuilder.mockReturnValueOnce(qb);

    await expect(service.update(entity.id, { starred: true })).rejects.toThrow(
      "You can star a maximum of 10 items in the oc category",
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("deletes the portrait when removing an OC", async () => {
    repository.findOne.mockResolvedValue({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name: "Mira",
      publicId: "oc/portrait.jpg",
    });

    await service.remove("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    expect(bunny.destroy).toHaveBeenCalledWith("oc/portrait.jpg", "image");
    expect(repository.remove).toHaveBeenCalled();
  });

  it("404s when the OC is missing", async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findOne("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
