import { RequestMethod } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { HealthController } from './health.controller';
import { configureWebHosting } from './web-hosting';

describe('Combined Vue and NestJS hosting', () => {
  let app: NestExpressApplication;
  let directory: string;
  const originalServe = process.env.SERVE_WEB;
  beforeAll(async () => {
    directory = await fs.mkdtemp(path.join(tmpdir(), 'sitf-web-test-'));
    await fs.writeFile(path.join(directory, 'index.html'), '<html>synthetic SPA</html>');
    await fs.writeFile(path.join(directory, 'app.js'), '/* synthetic */');
    process.env.SERVE_WEB = 'true';
    const module = await Test.createTestingModule({ controllers: [HealthController] }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api/v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] });
    configureWebHosting(app, directory);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    await fs.rm(directory, { recursive: true, force: true });
    if (originalServe === undefined) delete process.env.SERVE_WEB; else process.env.SERVE_WEB = originalServe;
  });
  it('serves the frontend and refreshes Vue routes', async () => {
    for (const url of ['/', '/patients', '/patients/synthetic/plan']) {
      const response = await request(app.getHttpServer()).get(url).set('Accept', 'text/html').expect(200);
      expect(response.text).toContain('synthetic SPA');
      expect(response.headers['cache-control']).toBe('no-store');
    }
    await request(app.getHttpServer()).get('/app.js').expect(200);
  });
  it('keeps health, missing API routes, assets and POST requests out of the SPA fallback', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
    await request(app.getHttpServer()).get('/api/v1/missing').set('Accept', 'text/html').expect(404);
    await request(app.getHttpServer()).get('/missing.js').expect(404);
    await request(app.getHttpServer()).post('/patients').expect(404);
  });
});
