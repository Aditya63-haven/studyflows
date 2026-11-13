import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { AVATAR_KEY_PATTERN } from '../src/config/avatar';
import { ValidationError } from '../src/errors';
import { LocalAvatarStorage } from '../src/storage/LocalAvatarStorage';

const readStream = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

describe('LocalAvatarStorage', () => {
  let directory: string;
  let storage: LocalAvatarStorage;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'studyflows-avatar-storage-'));
    storage = new LocalAvatarStorage(directory);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('saves avatars under an unpredictable .webp key', async () => {
    const first = await storage.save(Buffer.from('first avatar'));
    const second = await storage.save(Buffer.from('second avatar'));

    expect(first).toMatch(AVATAR_KEY_PATTERN);
    expect(second).toMatch(AVATAR_KEY_PATTERN);
    expect(first).not.toBe(second);
    expect(await readFile(join(directory, first), 'utf8')).toBe('first avatar');
  });

  it('reads and deletes a stored avatar', async () => {
    const key = await storage.save(Buffer.from('avatar bytes'));
    const result = await storage.get(key);

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error('Stored avatar was not found');
    }
    expect(result.size).toBe(12);
    expect(await readStream(result.stream)).toEqual(Buffer.from('avatar bytes'));

    await storage.delete(key);
    expect(await storage.get(key)).toBeNull();
    await expect(storage.delete(key)).resolves.toBeUndefined();
  });

  it('rejects unsafe keys and never resolves outside its root', async () => {
    expect(await storage.get('../outside.webp')).toBeNull();
    expect(await storage.get('not-a-valid-key.webp')).toBeNull();
    await expect(storage.delete('../outside.webp')).rejects.toBeInstanceOf(ValidationError);
  });
});
