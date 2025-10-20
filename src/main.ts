import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { Request, Response, NextFunction } from 'express';

config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar sesiones con MongoDB
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017',
        dbName: process.env.MONGODB_DB || 'test',
        collectionName: 'sessions',
        ttl: 60 * 60, // 1 hora en segundos
      }),
      cookie: {
        maxAge: 1000 * 60 * 60, // 1 hora en milisegundos
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Middleware personalizado para proteger Swagger
  app.use('/docs', (req: Request, res: Response, next: NextFunction) => {
    const session = req.session as typeof req.session & {
      userId?: string | null;
    };
    if (!session || !session.userId) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Debe iniciar sesión para acceder a la documentación',
      });
    }
    next();
  });

  // Swagger / OpenAPI setup con protección de sesión
  const docConfig = new DocumentBuilder()
    .setTitle('Sapo Main API')
    .setDescription('API para empleados y dispositivos')
    .setVersion('1.0.0')
    .addTag('auth')
    .addTag('users')
    .addTag('employees')
    .addTag('devices')
    .build();
  const document = SwaggerModule.createDocument(app, docConfig);

  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Sapo API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
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
        `Server started on http://${host}:${fallback} (fallback due to EADDRINUSE)`,
      );
    } else {
      throw err;
    }
  }
}
void bootstrap();
