import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({
    origin: config.get<string>("APP_URL") ?? "http://localhost:3000",
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const documentConfig = new DocumentBuilder()
    .setTitle("Pacta API")
    .setDescription("REST API for bonded covenant workflows.")
    .setVersion("0.1.0")
    .addCookieAuth("pacta_session")
    .build();
  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup("docs", app, document);

  await app.listen(config.get<number>("PORT") ?? 4000);
}

void bootstrap();
