import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { clientIpFromRequest } from "../common/client-ip";
import { RequestLogsService } from "./request-logs.service";

const SKIP_PATHS = new Set(["/", "/health"]);

@Injectable()
export class RequestIpMiddleware implements NestMiddleware {
  constructor(private readonly requestLogs: RequestLogsService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const path = (req.originalUrl ?? req.url ?? req.path ?? "").split("?")[0];
    if (!path || SKIP_PATHS.has(path) || req.method === "OPTIONS") {
      next();
      return;
    }

    const ip = clientIpFromRequest(req);
    if (ip) {
      void this.requestLogs.record({
        ip,
        method: req.method,
        path,
      });
    }
    next();
  }
}
