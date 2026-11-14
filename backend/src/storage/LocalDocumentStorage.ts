import { randomBytes } from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, stat, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { DocumentFormat, DOCUMENT_KEY_PATTERN } from '../domain/entities/StudyDocument';
import { DocumentReadResult, IDocumentStorage } from '../domain/interfaces/IDocumentStorage';
import { ValidationError } from '../errors';

/**
 * Stores original uploaded documents on local disk using opaque keys.
 */
export class LocalDocumentStorage implements IDocumentStorage {
  constructor(private readonly rootDir: string) {}

  public async save(buffer: Buffer, format: DocumentFormat): Promise<string> {
    await mkdir(this.rootDir, { recursive: true });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const key = LocalDocumentStorage.createKey(format);
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

    throw new Error('Could not allocate a unique document storage key');
  }

  public async get(key: string): Promise<DocumentReadResult | null> {
    if (!DOCUMENT_KEY_PATTERN.test(key)) {
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
    if (!DOCUMENT_KEY_PATTERN.test(key)) {
      throw new ValidationError('Invalid document storage key');
    }

    try {
      await unlink(join(this.rootDir, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private static createKey(format: DocumentFormat): string {
    return `${randomBytes(24).toString('hex')}.${format}`;
  }
}
