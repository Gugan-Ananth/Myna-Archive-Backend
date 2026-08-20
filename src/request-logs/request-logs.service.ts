import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RequestLogEntity } from "./entities/request-log.entity";

export type RecordRequestLogInput = {
  ip: string;
  method: string;
  path: string;
};

@Injectable()
export class RequestLogsService {
  private readonly logger = new Logger(RequestLogsService.name);

  constructor(
    @InjectRepository(RequestLogEntity)
    private readonly requestLogs: Repository<RequestLogEntity>,
  ) {}

  async record(input: RecordRequestLogInput): Promise<void> {
    try {
      await this.requestLogs.insert({
        ip: input.ip.slice(0, 45),
        method: input.method.slice(0, 16),
        path: input.path.slice(0, 512),
      });
    } catch (error) {
      this.logger.warn(
        `Could not persist request IP (${error instanceof Error ? error.name : "error"})`,
      );
    }
  }
}
