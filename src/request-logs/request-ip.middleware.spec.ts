import { ConfigService } from "@nestjs/config";
import type { NextFunction, Request, Response } from "express";
import { RequestIpMiddleware } from "./request-ip.middleware";
import type { RequestLogsService } from "./request-logs.service";

describe("RequestIpMiddleware", () => {
  const record = jest.fn().mockResolvedValue(undefined);
  const logs = { record } as unknown as RequestLogsService;
  const config = {
    get: jest.fn((key: string) =>
      key === "corsOrigin" ? "https://archive.example" : undefined,
    ),
  } as unknown as ConfigService;
  const middleware = new RequestIpMiddleware(logs, config);
  const res = {} as Response;
  const next: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (config.get as jest.Mock).mockImplementation((key: string) =>
      key === "corsOrigin" ? "https://archive.example" : undefined,
    );
  });

  function request(overrides: Partial<Request> & { headers?: Request["headers"] }): Request {
    return {
      method: "GET",
      originalUrl: "/api/v1/archive-items",
      headers: {},
      ...overrides,
    } as unknown as Request;
  }

  it("records IP for frontend API calls without blocking next()", () => {
    const req = request({
      originalUrl: "/api/v1/archive-items?q=fog",
      headers: {
        origin: "https://archive.example",
        "x-forwarded-for": "203.0.113.10",
      },
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith({
      ip: "203.0.113.10",
      method: "GET",
      path: "/api/v1/archive-items",
    });
  });

  it("records IP when Referer matches the frontend origin", () => {
    const req = request({
      headers: {
        referer: "https://archive.example/item/abc",
        "x-forwarded-for": "198.51.100.20",
      },
    });

    middleware.use(req, res, next);

    expect(record).toHaveBeenCalledWith({
      ip: "198.51.100.20",
      method: "GET",
      path: "/api/v1/archive-items",
    });
  });

  it("skips health checks", () => {
    const req = request({
      originalUrl: "/health",
      headers: {
        origin: "https://archive.example",
        "x-forwarded-for": "203.0.113.10",
      },
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it("skips scanner paths such as robots.txt", () => {
    const req = request({
      originalUrl: "/robots.txt",
      headers: { "x-forwarded-for": "115.231.78.11" },
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it("skips API calls that do not come from the frontend origin", () => {
    const req = request({
      headers: { "x-forwarded-for": "54.81.90.103" },
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it("skips API calls from a different origin", () => {
    const req = request({
      headers: {
        origin: "https://evil.example",
        "x-forwarded-for": "35.170.67.208",
      },
    });

    middleware.use(req, res, next);

    expect(record).not.toHaveBeenCalled();
  });
});
