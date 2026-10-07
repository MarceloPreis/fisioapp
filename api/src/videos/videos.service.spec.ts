const tenantId = '00000000-0000-4000-8000-000000000001';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { VideosService } from './videos.service';

describe('Video uploads (synthetic bytes only)', () => {
  let service: VideosService;
  let directory: string;
  let storage: any;
  beforeEach(async () => {
    directory = path.join(process.cwd(), 'temp_uploads', `test-${randomUUID()}`);
    storage = { bucket: 'videos', client: { fPutObject: jest.fn(async () => {}), statObject: jest.fn(async () => ({})) } };
    service = new VideosService(storage);
    Object.defineProperty(service, 'root', { value: directory });
    await service.onModuleInit();
  });
  afterEach(async () => {
    await (service as any).queue;
    await fs.rm(directory, { recursive: true, force: true });
  });
  it('rejects traversal and uploads from another user', async () => {
    await expect(service.saveChunk('../outside', 0, Buffer.from('x'), 'u', tenantId)).rejects.toThrow();
    const { uploadId } = await service.initUpload('u', 1, tenantId);
    await expect(service.status(uploadId, 'other', tenantId)).rejects.toThrow();
    await expect(service.saveChunk(uploadId, 0, Buffer.from('x'), 'other', tenantId)).rejects.toThrow();
  });
  it('rejects missing chunks, then accepts a retry', async () => {
    const { uploadId } = await service.initUpload('u', 2, tenantId);
    await service.saveChunk(uploadId, 0, Buffer.from('0000ftyp0000'), 'u', tenantId);
    await expect(service.completeUpload(uploadId, 'test.mp4', 'u', tenantId)).rejects.toThrow();
    await service.saveChunk(uploadId, 1, Buffer.from('synthetic'), 'u', tenantId);
    await expect(service.completeUpload(uploadId, 'test.mp4', 'u', tenantId)).resolves.toMatchObject({ state: 'processing' });
    await (service as any).queue;
    await expect(service.status(uploadId, 'u', tenantId)).resolves.toMatchObject({ state: 'complete', videoObjectName: `tenants/${tenantId}/videos/u/${uploadId}.mp4` });
    expect(storage.client.fPutObject).toHaveBeenCalledTimes(1);
  });
  it('accepts identical retries and rejects conflicting chunks', async () => {
    const { uploadId } = await service.initUpload('u', 1, tenantId);
    await service.saveChunk(uploadId, 0, Buffer.from('x'), 'u', tenantId);
    await expect(service.saveChunk(uploadId, 0, Buffer.from('x'), 'u', tenantId)).resolves.toBeUndefined();
    await expect(service.saveChunk(uploadId, 0, Buffer.from('y'), 'u', tenantId)).rejects.toThrow();
    await expect(service.saveChunk(uploadId, -1, Buffer.from('x'), 'u', tenantId)).rejects.toThrow();
  });
  it('does not publish invalid MP4 files', async () => {
    const { uploadId } = await service.initUpload('u', 1, tenantId);
    await service.saveChunk(uploadId, 0, Buffer.from('invalid'), 'u', tenantId);
    await service.completeUpload(uploadId, 'fake.mp4', 'u', tenantId);
    await (service as any).queue;
    await expect(service.status(uploadId, 'u', tenantId)).resolves.toMatchObject({ state: 'failed', videoObjectName: null });
    expect(storage.client.fPutObject).not.toHaveBeenCalled();
  });
  it('does not bind another user video to an execution', async () => {
    await expect(service.assertObjectOwner(`videos/other/${randomUUID()}.mp4`, 'u', tenantId)).rejects.toThrow();
    expect(storage.client.statObject).not.toHaveBeenCalled();
  });
  it('rejects another clinic even when the owner identifier matches', async () => {
    const otherTenant = '00000000-0000-4000-8000-000000000002';
    const { uploadId } = await service.initUpload('u', 1, tenantId);
    await expect(service.status(uploadId, 'u', otherTenant)).rejects.toThrow();
    await expect(service.saveChunk(uploadId, 0, Buffer.from('x'), 'u', otherTenant)).rejects.toThrow();
    await expect(service.completeUpload(uploadId, 'test.mp4', 'u', otherTenant)).rejects.toThrow();
    await expect(service.assertObjectOwner(`tenants/${otherTenant}/videos/u/${uploadId}.mp4`, 'u', tenantId)).rejects.toThrow();
    expect(storage.client.statObject).not.toHaveBeenCalled();
  });
});
