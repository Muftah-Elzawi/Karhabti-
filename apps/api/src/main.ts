import './instrument'; // Sentry — must be the first import

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import type { Env } from './config/env';
import { parseCorsOrigins } from './config/env';

async function bootstrap(): Promise<void> {
  // rawBody: true preserves the unparsed request body so the Plutu webhook can
  // verify the HMAC signature against the exact bytes Plutu signed.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.useLogger(app.get(Logger));

  const config: ConfigService<Env, true> = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({ origin: parseCorsOrigins(config.get('CORS_ORIGINS', { infer: true })) });
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  const openApiConfig = new DocumentBuilder()
    .setTitle('Karhabti API')
    .setDescription(
      'Car-care super-app for Libya — services, parts, and the car-care companion. ' +
        'All responses use the `{ data, meta, error }` envelope.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
