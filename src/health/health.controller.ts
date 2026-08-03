import { Controller, Get } from '@nestjs/common';
import { CloudinaryService } from '../media/cloudinary.service';
import { DatabaseHealthService } from '../database/database-health.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseHealth: DatabaseHealthService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get()
  async check(): Promise<{
    status: 'ok' | 'degraded';
    postgres: boolean;
    cloudinary: boolean;
  }> {
    const [postgres, cloudinaryOk] = await Promise.all([
      this.databaseHealth.isHealthy(),
      this.cloudinary.ping(),
    ]);

    return {
      status: postgres && cloudinaryOk ? 'ok' : 'degraded',
      postgres,
      cloudinary: cloudinaryOk,
    };
  }
}
