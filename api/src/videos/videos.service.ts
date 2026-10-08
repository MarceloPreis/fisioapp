import { requireTenant } from '../auth/current-user.decorator';
import { Injectable, BadRequestException, ForbiddenException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { promises as fs, createReadStream, createWriteStream } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

interface Upload { tenantId: string; owner: string; totalChunks: number; state: 'pending' | 'processing' | 'complete' | 'failed'; createdAt: number; objectName?: string; }
@Injectable()
export class VideosService implements OnModuleInit {
  private readonly root = path.resolve(process.cwd(), 'temp_uploads');
  private queue: Promise<void> = Promise.resolve();
  constructor(private readonly storageService: StorageService) {}
  get limits() { return { maxVideoBytes: this.storageService.maxVideoBytes, chunkBytes: 4 * 1024 * 1024 }; }
  async onModuleInit() {
    await fs.mkdir(this.root, { recursive: true });
    for (const id of await fs.readdir(this.root)) {
      if (!/^[0-9a-f-]{36}$/.test(id)) continue;
      const item = await this.read(id).catch(() => null);
      if (item?.tenantId && item.state === 'processing') this.enqueue(id, item);
      if (item && Date.now() - item.createdAt > 24 * 3600000 && item.state !== 'processing') await fs.rm(this.directory(id), { recursive: true, force: true });
    }
  }
  private enqueue(id: string, item: Upload) {
    this.queue = this.queue.then(() => this.assemble(id, item)).catch(async () => { item.state = 'failed'; await this.persist(id, item).catch(() => {}); });
  }
  private directory(id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new BadRequestException('Envio inválido.');
    return path.join(this.root, id);
  }
  private async read(id: string): Promise<Upload> {
    const file = path.join(this.directory(id), 'metadata.json');
    try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { throw new NotFoundException('Envio não encontrado.'); }
  }
  private async persist(id: string, item: Upload) { const temporary = path.join(this.directory(id), 'metadata.tmp'); await fs.writeFile(temporary, JSON.stringify(item)); await fs.rename(temporary, path.join(this.directory(id), 'metadata.json')); }
  private async owned(id: string, owner: string, tenantId: string) {
    const item = await this.read(id);
    if (item.tenantId !== requireTenant(tenantId) || item.owner !== owner) throw new ForbiddenException();
    return item;
  }
  async initUpload(owner: string, totalChunks: number, tenantId: string) {
    requireTenant(tenantId);
    let active = 0;
    for (const id of await fs.readdir(this.root)) {
      if (!/^[0-9a-f-]{36}$/.test(id)) continue;
      const item = await this.read(id).catch(() => null);
      if (item && Date.now() - item.createdAt > 24 * 3600000 && item.state !== 'processing') { await fs.rm(this.directory(id), { recursive: true, force: true }); continue; }
      if (item?.owner === owner && ['pending', 'processing'].includes(item.state)) active++;
    }
    if (active >= 3) throw new BadRequestException('Limite de envios simultâneos atingido.');
    const uploadId = randomUUID();
    await fs.mkdir(this.directory(uploadId), { recursive: true });
    await this.persist(uploadId, { tenantId, owner, totalChunks, state: 'pending', createdAt: Date.now() });
    return { uploadId };
  }
  async saveChunk(id: string, index: number, data: Buffer, owner: string, tenantId: string) {
    const item = await this.owned(id, owner, tenantId);
    if (item.state !== 'pending' || !Number.isInteger(index) || index < 0 || index >= item.totalChunks || !data?.length || data.length > 8 * 1024 * 1024) throw new BadRequestException('Parte do vídeo inválida.');
    if (await fs.access(path.join(this.directory(id), 'complete.lock')).then(() => true, () => false)) throw new BadRequestException('Envio em conclusão.');
    const destination = path.join(this.directory(id), String(index));
    const lockPath = path.join(this.directory(id), 'chunk.lock');
    const lock = await fs.open(lockPath, 'wx').catch(() => { throw new BadRequestException('Parte do vídeo em processamento.'); });
    await lock.close();
    try {
      if (await fs.access(path.join(this.directory(id), 'complete.lock')).then(() => true, () => false)) throw new BadRequestException('Envio em processamento.');
      if (await fs.access(destination).then(() => true, () => false)) {
        if (!(await fs.readFile(destination)).equals(data)) throw new BadRequestException('Parte do vídeo já recebida com conteúdo diferente.');
        return;
      }
      let size = data.length;
      for (const entry of await fs.readdir(this.directory(id))) if (/^\d+$/.test(entry)) size += (await fs.stat(path.join(this.directory(id), entry))).size;
      if (size > this.storageService.maxVideoBytes) throw new BadRequestException('Vídeo excede o limite configurado.');
      const temporary = `${destination}.part`;
      await fs.writeFile(temporary, data);
      await fs.rename(temporary, destination);
    } finally { await fs.rm(lockPath, { force: true }); }

  }
  async completeUpload(id: string, fileName: string, owner: string, tenantId: string) {
    const item = await this.owned(id, owner, tenantId);
    if (item.state !== 'pending') return this.status(id, owner, tenantId);
    const lock = await fs.open(path.join(this.directory(id), 'complete.lock'), 'wx').catch(() => { throw new BadRequestException('Conclusão já solicitada.'); });
    await lock.close();
    try {
      if (await fs.access(path.join(this.directory(id), 'chunk.lock')).then(() => true, () => false)) throw new BadRequestException('Parte do vídeo em processamento.');
      let size = 0;
      for (let i = 0; i < item.totalChunks; i++) size += (await fs.stat(path.join(this.directory(id), String(i)))).size;
      if (size > this.storageService.maxVideoBytes) throw new BadRequestException('Vídeo excede o limite configurado.');
    } catch {
      await fs.rm(path.join(this.directory(id), 'complete.lock'), { force: true });
      throw new BadRequestException('Envio incompleto.');
    }
    item.state = 'processing';
    item.objectName = `tenants/${tenantId}/videos/${owner}/${id}.mp4`;
    await this.persist(id, item);
    this.enqueue(id, item);
    return { uploadId: id, state: item.state };
  }
  async status(id: string, owner: string, tenantId: string) {
    const item = await this.owned(id, owner, tenantId);
    return { uploadId: id, state: item.state, videoObjectName: item.state === 'complete' ? item.objectName : null };
  }
  async assertObjectOwner(objectName: string, owner: string, tenantId: string) {
    requireTenant(tenantId);
    const match = /^tenants\/([^/]+)\/videos\/([^/]+)\/([0-9a-f-]+)\.mp4$/.exec(objectName);
    if (!match || match[1] !== tenantId || match[2] !== owner) throw new ForbiddenException();
    await this.storageService.assertObjectExists(objectName).catch(() => { throw new BadRequestException('Vídeo indisponível.'); });
  }
  private async assemble(id: string, item: Upload) {
    const directory = this.directory(id);
    const finalPath = path.join(directory, 'assembled.mp4');
    try {
      async function* chunks() {
        for (let i = 0; i < item.totalChunks; i++) for await (const data of createReadStream(path.join(directory, String(i)))) yield data;
      }
      await pipeline(Readable.from(chunks()), createWriteStream(finalPath));
      const handle = await fs.open(finalPath, 'r');
      const header = Buffer.alloc(12);
      try { await handle.read(header, 0, 12, 0); } finally { await handle.close(); }
      if (header.toString('ascii', 4, 8) !== 'ftyp') throw new Error('Formato MP4 inválido');
      await this.storageService.uploadFile(item.objectName!, finalPath);
      item.state = 'complete';
    } catch { item.state = 'failed'; }
    finally {
      await this.persist(id, item);
      await fs.rm(finalPath, { force: true });
      for (let i = 0; i < item.totalChunks; i++) await fs.rm(path.join(directory, String(i)), { force: true });
    }
  }
}
