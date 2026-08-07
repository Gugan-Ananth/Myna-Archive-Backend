import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseHealthService } from "./database-health.service";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        host: config.getOrThrow<string>("database.host"),
        port: config.getOrThrow<number>("database.port"),
        username: config.getOrThrow<string>("database.username"),
        password: config.getOrThrow<string>("database.password"),
        database: config.getOrThrow<string>("database.name"),
        autoLoadEntities: true,
        synchronize: config.get<boolean>("database.synchronize") ?? false,
        logging: config.get<boolean>("database.logging") ?? false,
      }),
    }),
  ],
  providers: [DatabaseHealthService],
  exports: [TypeOrmModule, DatabaseHealthService],
})
export class DatabaseModule {}
