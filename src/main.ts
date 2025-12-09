import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';

config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, Cookie',
    credentials: true,
  });

  // Middleware para loggear todas las peticiones HTTP
  app.use((req: Request, res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString();
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🌐 [HTTP REQUEST] ${timestamp}`);
    console.log(`🌐 [HTTP] Método: ${req.method}`);
    console.log(`🌐 [HTTP] URL: ${req.url}`);
    console.log(`🌐 [HTTP] Path: ${req.path}`);
    console.log(
      `🌐 [HTTP] Origin: ${req.headers.origin ?? 'No origin header'}`,
    );
    console.log(`🌐 [HTTP] Referer: ${req.headers.referer ?? 'No referer'}`);
    console.log(`🌐 [HTTP] Query params:`, req.query);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    const originalSend = res.send.bind(res) as (data: unknown) => Response;
    res.send = function (data: unknown): Response {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`🌐 [HTTP RESPONSE] ${timestamp}`);
      console.log(`🌐 [HTTP RESPONSE] Status: ${res.statusCode}`);
      console.log(`🌐 [HTTP RESPONSE] Path: ${req.method} ${req.path}`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      return originalSend(data);
    } as typeof res.send;

    next();
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
