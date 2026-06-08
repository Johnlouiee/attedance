import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS so Angular frontend can talk to this API
  app.enableCors({
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Serve profile photo files statically
  app.useStaticAssets(join(process.cwd(), 'pictures'), {
    prefix: '/pictures/',
  });

  // Global prefix — all routes will be /api/v1/...
  app.setGlobalPrefix('api/v1');

  await app.listen(3000);
  console.log('AttenGuard Backend running on http://localhost:3000');
}
bootstrap();
