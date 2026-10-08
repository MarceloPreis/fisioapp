import { createClient } from '@supabase/supabase-js';
import * as Minio from 'minio';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { StorageService } from './storage.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('minio', () => ({ Client: jest.fn() }));

describe('Storage providers (synthetic data, mocked remote services)', () => {
  const originalEnv = process.env;
  let bucket: any;
  let remote: any;
  beforeEach(() => {
    process.env = { ...originalEnv, STORAGE_PROVIDER: 'supabase', CLOUD_VALIDATION_ONLY: 'true',
      HL7_ENABLED: 'false', MAX_VIDEO_MB: '50', STORAGE_BUCKET: 'videos',
      SUPABASE_URL: 'https://synthetic.supabase.co', SUPABASE_SECRET_KEY: '', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-server-key' };
    bucket = {
      exists: jest.fn(async () => ({ data: true, error: null })),
      upload: jest.fn(async (_key, stream) => {
        const chunks: Buffer[] = [];
        for await (const chunk of stream) chunks.push(chunk);
        expect(Buffer.concat(chunks).toString()).toBe('0000ftyp0000');
        return { data: {}, error: null };
      }),
      createSignedUrl: jest.fn(async () => ({ data: { signedUrl: 'https://synthetic.supabase.co/storage/v1/object/sign/synthetic' }, error: null })),
    };
    remote = { storage: { getBucket: jest.fn(async () => ({ data: { public: false }, error: null })), from: jest.fn(() => bucket) } };
    (createClient as jest.Mock).mockReturnValue(remote);
  });
  afterEach(() => { process.env = originalEnv; jest.clearAllMocks(); });

  it('accepts the current server secret and prefers it over the legacy service role key', () => {
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_synthetic';
    new StorageService();
    expect(createClient).toHaveBeenCalledWith('https://synthetic.supabase.co', 'sb_secret_synthetic', expect.any(Object));
  });

  it('refuses missing or public buckets without leaking provider error details', async () => {
    remote.storage.getBucket.mockResolvedValue({ data: { public: true }, error: null });
    await expect(new StorageService().onModuleInit()).rejects.toThrow('bucket privado');
    remote.storage.getBucket.mockResolvedValue({ data: null, error: { message: 'sensitive-token' } });
    await expect(new StorageService().onModuleInit()).rejects.not.toThrow('sensitive-token');
  });
  it('streams MP4 into the private bucket without overwriting existing objects', async () => {
    const service = new StorageService();
    await service.onModuleInit();
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'sitf-storage-test-'));
    try {
      const file = path.join(dir, 'synthetic.mp4');
      await fs.writeFile(file, '0000ftyp0000');
      await service.uploadFile('tenants/synthetic/video.mp4', file);
      expect(remote.storage.from).toHaveBeenCalledWith('videos');
      expect(bucket.upload).toHaveBeenCalledWith('tenants/synthetic/video.mp4', expect.anything(),
        { contentType: 'video/mp4', upsert: false, duplex: 'half' });
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
  });
  it('rejects files over the cloud limit before contacting the provider', async () => {
    const service = new StorageService();
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'sitf-storage-limit-'));
    try {
      const file = path.join(dir, 'synthetic.mp4');
      const handle = await fs.open(file, 'w');
      await handle.truncate(service.maxVideoBytes + 1);
      await handle.close();
      await expect(service.uploadFile('synthetic', file)).rejects.toThrow('limite');
      expect(bucket.upload).not.toHaveBeenCalled();
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
  });
  it('requires object existence and preserves five-minute signed access', async () => {
    const service = new StorageService();
    await service.assertObjectExists('synthetic.mp4');
    expect(bucket.exists).toHaveBeenCalledWith('synthetic.mp4');
    bucket.exists.mockResolvedValue({ data: false, error: null });
    await expect(service.assertObjectExists('missing.mp4')).rejects.toThrow('indisponível');
    await expect(service.generatePresignedUrl('synthetic.mp4')).resolves.toMatch(/^https:/);
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('synthetic.mp4', 300);
    await expect(service.generatePresignedUrl('synthetic.mp4', 301)).rejects.toThrow('cinco minutos');
    bucket.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'secret' } });
    await expect(service.generatePresignedUrl('synthetic.mp4')).rejects.toThrow('acesso temporário');
  });
  it('keeps the local MinIO initialization and upload behavior', async () => {
    process.env.STORAGE_PROVIDER = 'minio';
    process.env.MINIO_ACCESS_KEY = 'synthetic';
    process.env.MINIO_SECRET_KEY = 'synthetic-secret';
    const local = { bucketExists: jest.fn(async () => false), makeBucket: jest.fn(async () => {}),
      statObject: jest.fn(async () => ({})), presignedGetObject: jest.fn(async () => 'http://localhost/synthetic') };
    (Minio.Client as jest.Mock).mockReturnValue(local);
    const service = new StorageService();
    await service.onModuleInit();
    expect(local.makeBucket).toHaveBeenCalledWith('videos', 'us-east-1');
    await service.assertObjectExists('synthetic');
    expect(local.statObject).toHaveBeenCalledWith('videos', 'synthetic');
    await expect(service.generatePresignedUrl('synthetic')).resolves.toBe('http://localhost/synthetic');
  });
});
