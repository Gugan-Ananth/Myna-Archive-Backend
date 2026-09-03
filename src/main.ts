import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express from "express";
import { AppModule } from "./app.module";

/** Covers a 200k-char story JSON payload (UTF-8 + wrapping fields). */
const JSON_BODY_LIMIT = "2mb";

async function bootstrap() {
  const server = express();
  server.set("trust proxy", 1);
  server.use(express.json({ limit: JSON_BODY_LIMIT }));
  server.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bodyParser: false,
  });
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

  const port = config.get<number>("port") ?? 3001;
  await app.listen(port);
  logger.log(`Listening on http://localhost:${port}`);
  logger.log(`API prefix: /api/v1`);
  logger.log(`Health: http://localhost:${port}/health`);
}

void bootstrap();
