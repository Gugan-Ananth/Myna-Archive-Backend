import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  app.setGlobalPrefix("api/v1", {
    exclude: ["health", "/"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const corsOrigin = config.get<string>("corsOrigin");
  if (corsOrigin) {
    app.enableCors({ origin: corsOrigin });
  }

  // Trust the first reverse proxy so req.ip / X-Forwarded-For is the client.
  app.getHttpAdapter().getInstance().set("trust proxy", 1);

  const port = config.get<number>("port") ?? 3001;
  await app.listen(port);
  logger.log(`Listening on http://localhost:${port}`);
  logger.log(`API prefix: /api/v1`);
  logger.log(`Health: http://localhost:${port}/health`);
}

void bootstrap();
