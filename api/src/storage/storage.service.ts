import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createReadStream, promises as fs } from 'fs';
import * as Minio from 'minio';
import { storageSettings } from './storage-settings';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly settings = storageSettings();
  private readonly bucketName = process.env.STORAGE_BUCKET || 'videos';
  private readonly minioClient?: Minio.Client;
  private readonly supabase?: SupabaseClient;

  constructor() {
    if (this.settings.provider === 'supabase') {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no backend.');
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
        throw new Error('SUPABASE_URL deve ser a origem HTTPS do projeto.');
      }
      this.supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      return;
    }
    const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : 9000;
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;

    if (!accessKey || !secretKey) throw new Error('Configure MINIO_ACCESS_KEY e MINIO_SECRET_KEY.');
    this.minioClient = new Minio.Client({
      endPoint,
      ...(port ? { port } : {}),
      useSSL,
      accessKey,
      secretKey,
    });
  }

  async onModuleInit() {
    try {
      if (this.supabase) {
        const { data, error } = await this.supabase.storage.getBucket(this.bucketName);
        if (error || !data || data.public) throw new Error();
        return;
      }
      const exists = await this.minioClient!.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient!.makeBucket(this.bucketName, 'us-east-1');
      }
    } catch {
      // Provider errors can contain object names, URLs or credentials.
      throw new Error('Armazenamento indisponível: confira credenciais e bucket privado.');
    }
  }

  get maxVideoBytes(): number { return this.settings.maxVideoBytes; }

  async uploadFile(objectName: string, filePath: string): Promise<void> {
    const { size } = await fs.stat(filePath);
    if (size > this.maxVideoBytes) throw new Error('Vídeo excede o limite configurado.');
    if (this.supabase) {
      const stream = createReadStream(filePath);
      try {
        const { error } = await this.supabase.storage.from(this.bucketName).upload(objectName, stream, {
          contentType: 'video/mp4', upsert: false, duplex: 'half',
        });
        if (error) throw new Error();
      } catch {
        throw new Error('Falha ao armazenar vídeo.');
      } finally {
        stream.destroy();
      }
      return;
    }
    await this.minioClient!.fPutObject(this.bucketName, objectName, filePath, { 'Content-Type': 'video/mp4' });
  }

  async assertObjectExists(objectName: string): Promise<void> {
    if (this.supabase) {
      const { data, error } = await this.supabase.storage.from(this.bucketName).exists(objectName);
      if (error || !data) throw new Error('Vídeo indisponível.');
      return;
    }
    await this.minioClient!.statObject(this.bucketName, objectName);
  }

  async generatePresignedUrl(objectName: string, expiryInSeconds = 300): Promise<string> {
    if (!Number.isInteger(expiryInSeconds) || expiryInSeconds < 1 || expiryInSeconds > 300) {
      throw new Error('URLs de vídeo devem expirar em até cinco minutos.');
    }
    if (this.supabase) {
      const { data, error } = await this.supabase.storage.from(this.bucketName).createSignedUrl(objectName, expiryInSeconds);
      if (error || !data?.signedUrl) throw new Error('Falha ao gerar acesso temporário ao vídeo.');
      return data.signedUrl;
    }
    return this.minioClient!.presignedGetObject(this.bucketName, objectName, expiryInSeconds);
  }
}
