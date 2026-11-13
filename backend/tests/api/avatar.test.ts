import { constants } from 'fs';
import { access, mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import sharp from 'sharp';
import request from 'supertest';
import { createApp } from '../../src/app';
import { Database } from '../../src/config/Database';
import { AVATAR_MAX_BYTES } from '../../src/config/avatar';
import { createContainer } from '../../src/container';
import { UserModel } from '../../src/persistence/schemas/user.schema';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const createImage = (format: 'jpeg' | 'png' | 'webp', width = 900, height = 600) =>
  sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 32, g: 180, b: 130, alpha: 1 },
    },
  })
    [format]()
    .toBuffer();

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const keyFromUrl = (avatarUrl: string): string => {
  const key = avatarUrl.split('/').pop();
  if (!key) {
    throw new Error(`Missing avatar key in ${avatarUrl}`);
  }
  return key;
};

describe('profile avatar API', () => {
  let mongo: MongoMemoryServer;
  let app: Express;
  let avatarDirectory: string;
  let token: string;
  let userId: string;

  const credentials = {
    name: 'Avatar Owner',
    email: 'avatar-owner@example.com',
    password: 'password123',
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'avatar-api-test-secret';
    process.env.AI_PROVIDER = 'mock';
    process.env.REVISION_STRATEGY = 'sm2';

    avatarDirectory = await mkdtemp(join(tmpdir(), 'studyflows-avatar-api-'));
    process.env.AVATAR_STORAGE_DIR = avatarDirectory;

    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('studyflows-avatar');

    await Database.getInstance().connect(process.env.MONGODB_URI);
    app = createApp(createContainer());
  }, 120_000);

  afterAll(async () => {
    await Database.getInstance().disconnect();
    await mongo.stop();
    await rm(avatarDirectory, { recursive: true, force: true });
  });

  it('registers a user without an avatar', async () => {
    const response = await request(app).post('/api/auth/register').send(credentials).expect(201);

    token = response.body.token;
    userId = response.body.user.id;

    expect(response.body.user.avatarUrl).toBeNull();
    expect(response.body.user).not.toHaveProperty('avatarKey');
  });

  it('rejects unauthenticated uploads and removals', async () => {
    const image = await createImage('png');

    await request(app)
      .post('/api/auth/me/avatar')
      .attach('avatar', image, { filename: 'avatar.png', contentType: 'image/png' })
      .expect(401);

    await request(app).delete('/api/auth/me/avatar').expect(401);
  });

  it('rejects unsupported, malformed and oversized files', async () => {
    const png = await createImage('png');
    const gif = await sharp(png).gif().toBuffer();
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>',
    );

    await request(app)
      .post('/api/auth/me/avatar')
      .set(auth(token))
      .attach('avatar', Buffer.from('plain text'), {
        filename: 'avatar.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    await request(app)
      .post('/api/auth/me/avatar')
      .set(auth(token))
      .attach('avatar', svg, {
        filename: 'avatar.svg',
        contentType: 'image/svg+xml',
      })
      .expect(400);

    await request(app)
      .post('/api/auth/me/avatar')
      .set(auth(token))
      .attach('avatar', gif, {
        filename: 'avatar.gif',
        contentType: 'image/gif',
      })
      .expect(400);

    await request(app)
      .post('/api/auth/me/avatar')
      .set(auth(token))
      .attach('avatar', Buffer.from('not really a png'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(400);

    await request(app)
      .post('/api/auth/me/avatar')
      .set(auth(token))
      .attach('avatar', Buffer.alloc(AVATAR_MAX_BYTES + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      })
      .expect(413);
  });

  it('uploads, processes and persists an avatar', async () => {
    const image = await createImage('jpeg', 1200, 800);
    const response = await request(app)
      .post('/api/auth/me/avatar')
      .set(auth(token))
      .attach('avatar', image, {
        filename: 'original-name.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    const avatarUrl = response.body.user.avatarUrl as string;
    const key = keyFromUrl(avatarUrl);
    const storedPath = join(avatarDirectory, key);

    expect(avatarUrl).toMatch(/^\/api\/avatars\/[a-f0-9]{48}\.webp$/);
    expect(JSON.stringify(response.body)).not.toContain(avatarDirectory);
    expect(await fileExists(storedPath)).toBe(true);

    const stored = await sharp(await readFile(storedPath)).metadata();
    expect(stored.format).toBe('webp');
    expect(stored.width).toBe(512);
    expect(stored.height).toBe(512);

    const persisted = await UserModel.findById(userId).lean().exec();
    expect(persisted?.avatarKey).toBe(key);

    const me = await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    expect(me.body.user.avatarUrl).toBe(avatarUrl);

    const imageResponse = await request(app).get(avatarUrl).expect(200);
    expect(imageResponse.headers['content-type']).toBe('image/webp');
    expect(imageResponse.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(imageResponse.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns the avatar after logout and login', async () => {
    const current = await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    const avatarUrl = current.body.user.avatarUrl as string;

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    expect(login.body.user.avatarUrl).toBe(avatarUrl);
    expect(login.body.user).not.toHaveProperty('avatarKey');
  });

  it('keeps the avatar when the display name changes', async () => {
    const before = await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    const avatarUrl = before.body.user.avatarUrl as string;

    const updated = await request(app)
      .patch('/api/auth/me')
      .set(auth(token))
      .send({ name: 'Avatar Owner Renamed' })
      .expect(200);

    expect(updated.body.user.name).toBe('Avatar Owner Renamed');
    expect(updated.body.user.avatarUrl).toBe(avatarUrl);
  });

  it('replaces the avatar and cleans up the previous file', async () => {
    const before = await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    const oldKey = keyFromUrl(before.body.user.avatarUrl as string);

    const image = await createImage('webp', 500, 1500);
    const response = await request(app)
      .post('/api/auth/me/avatar')
      .set(auth(token))
      .attach('avatar', image, {
        filename: 'replacement.webp',
        contentType: 'image/webp',
      })
      .expect(200);

    const newKey = keyFromUrl(response.body.user.avatarUrl as string);
    expect(newKey).not.toBe(oldKey);
    expect(await fileExists(join(avatarDirectory, oldKey))).toBe(false);
    expect(await fileExists(join(avatarDirectory, newKey))).toBe(true);

    await request(app).get(`/api/avatars/${oldKey}`).expect(404);
  });

  it('allows another user to remove only their own avatar', async () => {
    const other = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Other Avatar Owner',
        email: 'other-avatar-owner@example.com',
        password: 'password123',
      })
      .expect(201);

    const ownerBefore = await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    const ownerAvatarUrl = ownerBefore.body.user.avatarUrl as string;

    const removed = await request(app)
      .delete('/api/auth/me/avatar')
      .set(auth(other.body.token as string))
      .expect(200);

    expect(removed.body.user.avatarUrl).toBeNull();
    expect(await fileExists(join(avatarDirectory, keyFromUrl(ownerAvatarUrl)))).toBe(true);

    const ownerAfter = await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    expect(ownerAfter.body.user.avatarUrl).toBe(ownerAvatarUrl);
  });

  it('removes the avatar, deletes the file and stays idempotent', async () => {
    const before = await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    const avatarUrl = before.body.user.avatarUrl as string;
    const key = keyFromUrl(avatarUrl);

    const removed = await request(app).delete('/api/auth/me/avatar').set(auth(token)).expect(200);

    expect(removed.body.user.avatarUrl).toBeNull();
    expect(await fileExists(join(avatarDirectory, key))).toBe(false);
    expect((await UserModel.findById(userId).lean().exec())?.avatarKey).toBeNull();

    await request(app).get(avatarUrl).expect(404);

    const again = await request(app).delete('/api/auth/me/avatar').set(auth(token)).expect(200);
    expect(again.body.user.avatarUrl).toBeNull();
  });
});
