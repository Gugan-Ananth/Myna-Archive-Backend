import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NextFunction, Request, Response } from "express";
import { clientIpFromRequest } from "../common/client-ip";
import { isApiPath, isFrontendRequest } from "./frontend-request";
import { RequestLogsService } from "./request-logs.service";

@Injectable()
export class RequestIpMiddleware implements NestMiddleware {
  constructor(
    private readonly requestLogs: RequestLogsService,
    private readonly config: ConfigService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const path = (req.originalUrl ?? req.url ?? req.path ?? "").split("?")[0];
    const corsOrigin = this.config.get<string>("corsOrigin") ?? "";
    if (
      !path ||
      req.method === "OPTIONS" ||
      !isApiPath(path) ||
      !isFrontendRequest(req.headers, corsOrigin)
    ) {
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
