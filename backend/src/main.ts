import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';

// BigInt cannot be serialized to JSON by default.
// This enables JSON.stringify() for Prisma BigInt fields (viewCount, fileSizeBytes, etc.)
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // CORS: allow frontend origin so cookies (refresh token) can be sent
  const corsOriginRaw = configService.get<string>('CORS_ORIGIN');
  const allowedOrigins = corsOriginRaw
    ? corsOriginRaw.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [
        'https://getyourguide.trancongtien.io.vn',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.use(cookieParser());

  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  app.use(morgan(isProduction ? 'combined' : 'dev'));

  // Global response interceptor
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Global exception filter (production-safe)
  app.useGlobalFilters(new HttpExceptionFilter(isProduction));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger API documentation (disabled in production)
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('GetYourGuide API')
      .setDescription('API documentation for GetYourGuide booking platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Server running on http://localhost:${port}`);
  if (!isProduction) {
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
}
bootstrap();
