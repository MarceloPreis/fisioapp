import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { existsSync } from 'fs';
import * as path from 'path';

export function configureWebHosting(app: NestExpressApplication, directory = path.resolve(__dirname, '../../../web/dist')) {
  if (process.env.SERVE_WEB !== 'true') return;
  const index = path.join(directory, 'index.html');
  if (!existsSync(index)) throw new Error('Frontend compilado ausente. Execute npm run web:build antes de iniciar.');
  const assets = express.static(directory, { index: false });
  app.use((request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (request.path === '/health' || request.path === '/api' || request.path.startsWith('/api/')) return next();
    assets(request, response, (error?: unknown) => {
      if (error) return next(error);
      if (!['GET', 'HEAD'].includes(request.method) || !request.accepts('html') || path.extname(request.path)) return next();
      response.setHeader('Cache-Control', 'no-store');
      response.sendFile(index);
    });
  });
}
