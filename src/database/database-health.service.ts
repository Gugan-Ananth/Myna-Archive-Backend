import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.dataSource.query('SELECT 1');
    this.logger.log('PostgreSQL connection OK');
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
