import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ArchiveItemEntity } from "../archive-items/entities/archive-item.entity";
import { TagsService } from "./tags.service";

describe("TagsService", () => {
  let service: TagsService;

  const repository = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(ArchiveItemEntity),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(TagsService);
  });

  it("returns tag summaries ordered as the SQL result (count DESC, tag ASC)", async () => {
    repository.query.mockResolvedValue([
      { tag: "ocean", count: "5" },
      { tag: "fog", count: 2 },
    ]);

    const result = await service.listSummaries();

    expect(repository.query).toHaveBeenCalled();
    expect(result).toEqual([
      { tag: "ocean", count: 5 },
      { tag: "fog", count: 2 },
    ]);
  });

  it("returns empty list when there are no tags", async () => {
    repository.query.mockResolvedValue([]);
    await expect(service.listSummaries()).resolves.toEqual([]);
  });
});
