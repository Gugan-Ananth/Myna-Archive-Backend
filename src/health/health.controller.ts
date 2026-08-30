import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { BunnyService } from "../media/bunny.service";
import { DatabaseHealthService } from "../database/database-health.service";

@Public()
@Controller("health")
export class HealthController {
  constructor(
    private readonly databaseHealth: DatabaseHealthService,
    private readonly bunny: BunnyService,
  ) {}

  @Get()
  async check(): Promise<{
    status: "ok" | "degraded";
    postgres: boolean;
    bunny: boolean;
  }> {
    const [postgres, bunnyOk] = await Promise.all([
      this.databaseHealth.isHealthy(),
      this.bunny.ping(),
    ]);

    return {
      status: postgres && bunnyOk ? "ok" : "degraded",
      postgres,
      bunny: bunnyOk,
    };
  }
}
