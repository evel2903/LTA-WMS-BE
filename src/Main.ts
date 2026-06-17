import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@app/App.module';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { RequestLoggingInterceptor } from '@common/Logging/RequestLoggingInterceptor';
import cookieParser from 'cookie-parser';

async function Bootstrap() {
  // Disable the default body parser so we can register a lenient JSON parser:
  // strict:false accepts an empty/`null` body (e.g. body-less POSTs like
  // /auth/logout and /auth/refresh) instead of failing with a 400 before the
  // request reaches the controller.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json', { strict: false });
  app.useBodyParser('urlencoded', { extended: true });

  const configService = app.get(ConfigService);

  app.use(cookieParser());

  app.useGlobalFilters(app.get(GlobalExceptionFilter));
  app.useGlobalInterceptors(app.get(RequestLoggingInterceptor), app.get(ResponseInterceptor));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Reflect request origin and allow credentials so HttpOnly auth cookies work cross-origin.
  app.enableCors({ origin: true, credentials: true });

  // Make version header optional for clients: default to v1 when not provided.
  app.use((req: { headers: Record<string, unknown> }, _res: unknown, next: () => void) => {
    if (!req.headers['x-api-version']) {
      req.headers['x-api-version'] = '1';
    }
    next();
  });

  app.enableVersioning({
    type: VersioningType.HEADER,
    header: 'X-API-Version',
    defaultVersion: '1',
  });

  if ((configService.get<string>('App.NodeEnv') ?? 'development') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('BE NestJS AppSeed API')
      .setDescription('API documentation')
      .setVersion('1')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-API-Version', in: 'header' }, 'ApiVersion')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = configService.get<number>('App.Port') ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  if ((configService.get<string>('App.NodeEnv') ?? 'development') !== 'production') {
    console.log(`Swagger is available at: http://localhost:${port}/docs`);
  }
}

Bootstrap();
