import { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { Database } from '../../src/config/Database';
import { createContainer } from '../../src/container';
import { UserModel } from '../../src/persistence/schemas/user.schema';

describe('profile update API', () => {
  let mongo: MongoMemoryServer;
  let app: Express;
  let token: string;
  let userId: string;

  const credentials = {
    name: 'Profile Owner',
    email: 'profile-owner@example.com',
    password: 'password123',
  };

  const auth = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'profile-update-test-secret';
    process.env.AI_PROVIDER = 'mock';
    process.env.REVISION_STRATEGY = 'sm2';

    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('studyflows-profile-update');

    await Database.getInstance().connect(process.env.MONGODB_URI);
    app = createApp(createContainer());
  }, 120_000);

  afterAll(async () => {
    await Database.getInstance().disconnect();
    await mongo.stop();
  });

  it('rejects profile updates without authentication', async () => {
    const response = await request(app)
      .patch('/api/auth/me')
      .send({ name: 'Anonymous' })
      .expect(401);

    expect(response.body.error.name).toBe('AuthError');
  });

  it('registers the profile owner', async () => {
    const response = await request(app).post('/api/auth/register').send(credentials).expect(201);

    token = response.body.token;
    userId = response.body.user.id;

    expect(token).toEqual(expect.any(String));
    expect(response.body.user.name).toBe(credentials.name);
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects empty, invalid and protected update payloads', async () => {
    await request(app).patch('/api/auth/me').set(auth(token)).send({ name: '' }).expect(400);

    await request(app).patch('/api/auth/me').set(auth(token)).send({ name: '   ' }).expect(400);

    await request(app).patch('/api/auth/me').set(auth(token)).send({ name: 42 }).expect(400);

    await request(app)
      .patch('/api/auth/me')
      .set(auth(token))
      .send({ name: 'a'.repeat(121) })
      .expect(400);

    for (const field of ['id', 'email', 'password', 'passwordHash', 'role', 'createdAt']) {
      await request(app)
        .patch('/api/auth/me')
        .set(auth(token))
        .send({ name: 'Attempted Change', [field]: 'tampered' })
        .expect(400);
    }

    const stored = await UserModel.findById(userId).lean().exec();
    expect(stored?.name).toBe(credentials.name);
  });

  it('updates only the name and preserves protected database fields', async () => {
    const before = await UserModel.findById(userId).lean().exec();
    if (!before) {
      throw new Error('Registered user was not found');
    }

    const countBefore = await UserModel.countDocuments({});

    const response = await request(app)
      .patch('/api/auth/me')
      .set(auth(token))
      .send({ name: '  Updated Student Name  ' })
      .expect(200);

    expect(response.body.user.name).toBe('Updated Student Name');
    expect(response.body.user.id).toBe(userId);
    expect(response.body.user.email).toBe(credentials.email);
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(new Date(response.body.user.createdAt).getTime()).toBe(before.createdAt.getTime());

    const after = await UserModel.findById(userId).lean().exec();
    if (!after) {
      throw new Error('Updated user was not found');
    }

    expect(after._id).toBe(before._id);
    expect(after.name).toBe('Updated Student Name');
    expect(after.email).toBe(before.email);
    expect(after.passwordHash).toBe(before.passwordHash);
    expect(after.createdAt.getTime()).toBe(before.createdAt.getTime());
    expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(before.updatedAt.getTime());
    expect(await UserModel.countDocuments({})).toBe(countBefore);

    const me = await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    expect(me.body.user.name).toBe('Updated Student Name');

    await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
  });

  it('returns 404 for an authenticated user that no longer exists', async () => {
    const registered = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Deleted User',
        email: 'deleted-profile@example.com',
        password: 'password123',
      })
      .expect(201);

    const deletedUserId = registered.body.user.id as string;
    const deletedToken = registered.body.token as string;

    await UserModel.deleteOne({ _id: deletedUserId });

    const response = await request(app)
      .patch('/api/auth/me')
      .set(auth(deletedToken))
      .send({ name: 'Cannot Update' })
      .expect(404);

    expect(response.body.error.name).toBe('NotFoundError');
    expect(await UserModel.countDocuments({})).toBe(1);
  });
});
