import { randomBytes } from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, stat, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { AVATAR_KEY_PATTERN } from '../config/avatar';
import { AvatarReadResult, IAvatarStorage } from '../domain/interfaces/IAvatarStorage';
import { ValidationError } from '../errors';

/**
 * Stores processed avatars on local disk using opaque, server-generated keys.
 */
export class LocalAvatarStorage implements IAvatarStorage {
  constructor(private readonly rootDir: string) {}

  public async save(buffer: Buffer): Promise<string> {
    await mkdir(this.rootDir, { recursive: true });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const key = LocalAvatarStorage.createKey();
      try {
        await writeFile(join(this.rootDir, key), buffer, {
          flag: 'wx',
          mode: 0o600,
        });
        return key;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Could not allocate a unique avatar storage key');
  }

  public async get(key: string): Promise<AvatarReadResult | null> {
    if (!AVATAR_KEY_PATTERN.test(key)) {
      return null;
    }

    const filePath = join(this.rootDir, key);
    try {
      const metadata = await stat(filePath);
      if (!metadata.isFile()) {
        return null;
      }
      return {
        stream: createReadStream(filePath),
        size: metadata.size,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  public async delete(key: string): Promise<void> {
    if (!AVATAR_KEY_PATTERN.test(key)) {
      throw new ValidationError('Invalid avatar storage key');
    }

    try {
      await unlink(join(this.rootDir, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private static createKey(): string {
    return `${randomBytes(24).toString('hex')}.webp`;
  }
}
