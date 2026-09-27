import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());

  // Detrás de un proxy/load balancer (Railway, Render, Cloudflare, nginx),
  // Express ve la IP del proxy y el rate limiting por IP deja de servir.
  // TRUST_PROXY=1 confía en el primer salto (el caso típico de un PaaS);
  // también acepta los demás valores que soporta Express ("loopback", etc.).
  const trustProxy = configService.get<string>('TRUST_PROXY');
  if (trustProxy && trustProxy !== 'false') {
    const numeric = Number(trustProxy);
    app.set('trust proxy', Number.isNaN(numeric) ? trustProxy : numeric);
  }

  // Cierre limpio ante SIGTERM/SIGINT (rolling deploys en PaaS): frena los
  // cron jobs y cierra las conexiones a la base antes de terminar.
  app.enableShutdownHooks();

  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      // Sin esto, los @Transform/@Type de los DTOs solo se aplican a la
      // copia que se valida, no al objeto que reciben los controllers.
      transform: true,
    }),
  );

  // Documentación interactiva de la API. Se puede apagar en producción
  // (SWAGGER_ENABLED=false) si no querés exponer el esquema completo
  // públicamente; no protege ningún endpoint por sí sola, solo genera docs.
  if (configService.get<string>('SWAGGER_ENABLED', 'true') === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NestJS Auth Roles Base API')
      .setDescription(
        'Autenticación JWT, roles, MFA (TOTP) y auditoría. Todas las rutas ' +
          'están bajo el prefijo /api salvo esta documentación.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
