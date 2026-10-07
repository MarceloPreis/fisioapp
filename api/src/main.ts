import { RequestMethod, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureWebHosting } from './deployment/web-hosting';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.setGlobalPrefix('api/v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] });
  app.use(cookieParser());
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(value => value.trim());
  app.use((request, response, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && request.headers.origin && !origins.includes(request.headers.origin)) return response.status(403).json({ message: 'Origem não permitida.' });
    next();
  });
  app.enableShutdownHooks();
  
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(value => value.trim()),
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  configureWebHosting(app);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
