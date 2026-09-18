import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module.js';
import appConfig from './config/app.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  const { port, corsOrigin } = app.get(appConfig.KEY);

  const config = new DocumentBuilder()
    .setTitle('Project Management API')
    .setDescription(
      'Multi-tenant project management and issue-tracking backend',
    )
    .setVersion('1.0')
    .addBearerAuth() // enables the "Authorize" button for JWT-protected routes
    .build();

  app.enableCors({
    origin:
      corsOrigin?.split(',').map((origin: string) => origin.trim()) ?? true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document); // served at /docs

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(port);
}
await bootstrap();
