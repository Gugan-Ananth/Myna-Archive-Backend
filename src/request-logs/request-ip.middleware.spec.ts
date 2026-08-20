import type { NextFunction, Request, Response } from "express";
import { RequestIpMiddleware } from "./request-ip.middleware";
import type { RequestLogsService } from "./request-logs.service";

describe("RequestIpMiddleware", () => {
  const record = jest.fn().mockResolvedValue(undefined);
  const logs = { record } as unknown as RequestLogsService;
  const middleware = new RequestIpMiddleware(logs);
  const res = {} as Response;
  const next: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records IP for API calls without blocking next()", () => {
    const req = {
      method: "GET",
      originalUrl: "/api/v1/archive-items?q=fog",
      headers: { "x-forwarded-for": "203.0.113.10" },
    } as unknown as Request;

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith({
      ip: "203.0.113.10",
      method: "GET",
      path: "/api/v1/archive-items",
    });
  });

  it("skips health checks", () => {
    const req = {
      method: "GET",
      originalUrl: "/health",
      headers: { "x-forwarded-for": "203.0.113.10" },
    } as unknown as Request;

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });
});
