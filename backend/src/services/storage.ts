import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

// ============================================================
// StorageService — generic interface ສຳລັບ local (dev) ແລະ R2 (prod)
// ປ່ຽນ provider ຜ່ານ STORAGE_PROVIDER env var: 'local' | 'r2'
// ============================================================

export interface StorageService {
  save(key: string, buffer: Buffer, mimeType: string): Promise<string>; // returns public URL
  delete(key: string): Promise<void>;
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

class LocalStorageService implements StorageService {
  async save(key: string, buffer: Buffer, _mimeType: string): Promise<string> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, key), buffer);
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(path.join(UPLOAD_DIR, key)).catch(() => {});
  }
}

class R2StorageService implements StorageService {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.storage.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.storage.r2AccessKeyId,
        secretAccessKey: env.storage.r2SecretAccessKey,
      },
    });
  }

  async save(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    await this.client.send(new PutObjectCommand({
      Bucket: env.storage.r2BucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }));
    return `https://${env.storage.r2PublicDomain}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: env.storage.r2BucketName,
      Key: key,
    }));
  }
}

// Singleton — created once at startup
let _storage: StorageService | null = null;

export function getStorage(): StorageService {
  if (!_storage) {
    _storage = env.storage.provider === 'r2' ? new R2StorageService() : new LocalStorageService();
  }
  return _storage;
}
