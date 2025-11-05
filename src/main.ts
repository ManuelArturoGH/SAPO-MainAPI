import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: 'https://sapo-web-app.test-apis-web-app.cloud',
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger / OpenAPI setup
  const docConfig = new DocumentBuilder()
    .setTitle('Sapo Main API')
    .setDescription('API para empleados y dispositivos')
    .setVersion('1.0.0')
    .addTag('employees')
    .addTag('devices')
    .build();
  const document = SwaggerModule.createDocument(app, docConfig);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Sapo API Docs',
  });

  const desiredPort = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  try {
    await app.listen(desiredPort, host);
  } catch (err: unknown) {
    if ((err as { code: string })?.code === 'EADDRINUSE') {
      const fallback = Number(process.env.PORT_FALLBACK ?? desiredPort + 1);

      console.warn(
        `Port ${desiredPort} is in use. Trying fallback port ${fallback}...`,
      );
      await app.listen(fallback, host);

      console.log(
        `Server started on https://${host}:${fallback} (fallback due to EADDRINUSE)`,
      );
    } else {
      throw err;
    }
  }
}
void bootstrap();
