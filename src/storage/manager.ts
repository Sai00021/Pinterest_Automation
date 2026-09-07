import { Env } from '../types';

export class StorageManager {
  private bucket: R2Bucket;

  constructor(env: Env) {
    if (!env.R2_BUCKET) {
      throw new Error('R2 Bucket not configured.');
    }
    this.bucket = env.R2_BUCKET;
  }

  async uploadImage(key: string, data: ArrayBuffer, contentType: string): Promise<string> {
    await this.bucket.put(key, data, {
      httpMetadata: { contentType },
    });
    // In production, you would construct the public URL for the R2 object.
    return `https://images.yourdomain.com/${key}`;
  }

  async getImage(key: string): Promise<ArrayBuffer | null> {
    const object = await this.bucket.get(key);
    if (!object) return null;
    return await object.arrayBuffer();
  }
}
