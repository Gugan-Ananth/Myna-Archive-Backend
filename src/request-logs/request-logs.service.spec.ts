import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { RequestLogEntity } from "./entities/request-log.entity";
import { RequestLogsService } from "./request-logs.service";

describe("RequestLogsService", () => {
  let service: RequestLogsService;
  const repository = {
    insert: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestLogsService,
        {
          provide: getRepositoryToken(RequestLogEntity),
          useValue: repository,
        },
      ],
    }).compile();
    service = module.get(RequestLogsService);
  });

  it("inserts the observed IP, method, and path", async () => {
    repository.insert.mockResolvedValue({ identifiers: [] });

    await service.record({
      ip: "203.0.113.10",
      method: "GET",
      path: "/api/v1/archive-items",
    });

    expect(repository.insert).toHaveBeenCalledWith({
      ip: "203.0.113.10",
      method: "GET",
      path: "/api/v1/archive-items",
    });
  });

  it("does not throw when persistence fails", async () => {
    repository.insert.mockRejectedValue(new Error("db down"));

    await expect(
      service.record({
        ip: "203.0.113.10",
        method: "GET",
        path: "/api/v1/archive-items",
      }),
    ).resolves.toBeUndefined();
  });
});
