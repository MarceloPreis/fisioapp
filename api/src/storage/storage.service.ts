import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private minioClient: Minio.Client;
  private readonly bucketName = 'videos';
  private readonly logger = new Logger(StorageService.name);

  constructor() {
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
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket '${this.bucketName}' criado com sucesso.`);
      } else {
        this.logger.log(`Bucket '${this.bucketName}' já existe.`);
      }
    } catch (error) {
      this.logger.error('MinIO indisponível.');
      throw new Error('MinIO indisponível.');
    }
  }

  get client(): Minio.Client {
    return this.minioClient;
  }

  get bucket(): string {
    return this.bucketName;
  }

  async generatePresignedUrl(objectName: string, expiryInSeconds = 300): Promise<string> {
    return await this.minioClient.presignedGetObject(this.bucketName, objectName, expiryInSeconds);
  }
}
