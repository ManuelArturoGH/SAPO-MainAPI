import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS with strict origin validation
  const allowedOrigins = [
    'https://sapo-web-app.test-apis-web-app.cloud',
    'http://sapo-web-app.test-apis-web-app.cloud',
    'https://sapo-api-app.test-apis-web-app.cloud',
    'http://sapo-api-app.test-apis-web-app.cloud',
  ];

  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (direct browser access, testing)
      if (!requestOrigin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${requestOrigin}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600,
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
