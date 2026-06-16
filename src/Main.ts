import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './App.module';
import { GlobalExceptionFilter } from './Common/Filters/GlobalExceptionFilter';
import { ResponseInterceptor } from './Common/Interceptors/ResponseInterceptor';
import { RequestLoggingInterceptor } from './Common/Logging/RequestLoggingInterceptor';

async function Bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalFilters(app.get(GlobalExceptionFilter));
  app.useGlobalInterceptors(app.get(RequestLoggingInterceptor), app.get(ResponseInterceptor));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

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
