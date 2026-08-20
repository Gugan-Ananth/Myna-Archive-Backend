import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RequestLogEntity } from "./entities/request-log.entity";
import { RequestIpMiddleware } from "./request-ip.middleware";
import { RequestLogsService } from "./request-logs.service";

@Module({
  imports: [TypeOrmModule.forFeature([RequestLogEntity])],
  providers: [RequestLogsService, RequestIpMiddleware],
})
export class RequestLogsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIpMiddleware).forRoutes("*");
  }
}
