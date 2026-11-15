import { Express } from 'express';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { Database } from '../../src/config/Database';
import { createContainer } from '../../src/container';

describe('exam preparation workflow API', () => {
  let mongo: MongoMemoryServer;
  let app: Express;
  let storageDir: string;
  let ownerToken: string;
  let intruderToken: string;
  let spaceId: string;
  let documentId: string;
  let planId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const examDate = () =>
    new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

  beforeAll(async () => {
    storageDir = await mkdtemp(join(tmpdir(), 'studyflows-preparation-'));
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'exam-preparation-test-secret';
    process.env.AI_PROVIDER = 'mock';
    process.env.AI_ACCESS_ADMIN_EMAIL = 'prep-owner@example.com';
    process.env.AI_USER_REQUESTS_PER_MINUTE = '100';
    process.env.AI_GLOBAL_REQUESTS_PER_MINUTE = '100';
    process.env.DOCUMENT_STORAGE_DIR = storageDir;
    process.env.DOCUMENT_MAX_BYTES = '1048576';

    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('studyflows-preparation');

    await Database.getInstance().connect(process.env.MONGODB_URI);
    app = createApp(createContainer());

    const owner = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Prep Owner',
        email: 'prep-owner@example.com',
        password: 'password123',
      })
      .expect(201);
    ownerToken = owner.body.token as string;

    const intruder = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Prep Intruder',
        email: 'prep-intruder@example.com',
        password: 'password123',
      })
      .expect(201);
    intruderToken = intruder.body.token as string;

    const space = await request(app)
      .post('/api/spaces')
      .set(auth(ownerToken))
      .send({ name: 'Biology', subject: 'Biology' })
      .expect(201);
    spaceId = space.body.space.id as string;

    const upload = await request(app)
      .post(`/api/spaces/${spaceId}/documents`)
      .set(auth(ownerToken))
      .attach(
        'file',
        Buffer.from(
          'Cell Biology covers membranes and organelles. Genetics covers inheritance and DNA.',
        ),
        { filename: 'syllabus.txt', contentType: 'text/plain' },
      )
      .expect(201);
    documentId = upload.body.document.id as string;

    const plan = await request(app)
      .post('/api/exam-plans')
      .set(auth(ownerToken))
      .send({
        name: 'Biology Final',
        examDate: examDate(),
        dailyStudyHours: 1,
        topics: [
          { name: 'Cell Biology', estimatedMinutes: 60 },
          { name: 'Genetics', estimatedMinutes: 60 },
        ],
      })
      .expect(201);
    planId = plan.body.examPlan.id as string;
  }, 120_000);

  afterAll(async () => {
    await Database.getInstance().disconnect();
    await mongo.stop();
    await rm(storageDir, { recursive: true, force: true });
  });

  it('returns owned syllabus documents, topic evidence and a deterministic preview', async () => {
    const response = await request(app)
      .get(`/api/exam-plans/${planId}/preparation?spaceId=${spaceId}`)
      .set(auth(ownerToken))
      .expect(200);

    const preparation = response.body.preparation;
    expect(preparation.space).toMatchObject({ id: spaceId, subject: 'Biology' });
    expect(preparation.documents).toEqual([
      expect.objectContaining({ id: documentId, selected: true }),
    ]);
    expect(preparation.topics).toHaveLength(2);
    expect(
      preparation.topics.some(
        (topic: { sources: unknown[] }) => topic.sources.length > 0,
      ),
    ).toBe(true);
    expect(preparation.schedule.days.length).toBeGreaterThan(0);

    await request(app)
      .get(`/api/exam-plans/${planId}`)
      .set(auth(ownerToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body.examPlan.preparation).toBeNull();
      });
  });

  it('previews AI strategy without persisting and approves only with the fingerprint', async () => {
    const preview = await request(app)
      .post(`/api/exam-plans/${planId}/preparation/preview`)
      .set(auth(ownerToken))
      .send({ spaceId, documentIds: [documentId] })
      .expect(200);

    const preparation = preview.body.preparation;
    expect(preparation.strategy).toMatchObject({
      provider: 'mock',
      fallback: false,
    });
    expect(preparation.strategy.items).toHaveLength(2);
    expect(preparation.approvalFingerprint).toEqual(expect.any(String));
    expect(preparation.topicOrder).toHaveLength(2);
    expect(preparation.requiresAcknowledgement).toBe(false);

    await request(app)
      .get(`/api/exam-plans/${planId}`)
      .set(auth(ownerToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body.examPlan.preparation).toBeNull();
      });

    const approved = await request(app)
      .post(`/api/exam-plans/${planId}/preparation/approve`)
      .set(auth(ownerToken))
      .send({
        spaceId,
        documentIds: [documentId],
        topicOrder: preparation.topicOrder,
        approvalFingerprint: preparation.approvalFingerprint,
        strategySummary: preparation.strategy.summary,
        provider: preparation.strategy.provider,
      })
      .expect(200);

    expect(approved.body.created).toBe(true);
    expect(approved.body.examPlan).toMatchObject({
      spaceId,
      documentIds: [documentId],
      preparation: expect.objectContaining({
        provider: 'mock',
        approvalFingerprint: preparation.approvalFingerprint,
      }),
    });
    expect(approved.body.examPlan.studyDays.length).toBeGreaterThan(0);

    const repeated = await request(app)
      .post(`/api/exam-plans/${planId}/preparation/approve`)
      .set(auth(ownerToken))
      .send({
        spaceId,
        documentIds: [documentId],
        topicOrder: preparation.topicOrder,
        approvalFingerprint: preparation.approvalFingerprint,
      })
      .expect(200);
    expect(repeated.body.created).toBe(false);

    await request(app)
      .post(`/api/exam-plans/${planId}/preparation/approve`)
      .set(auth(ownerToken))
      .send({
        spaceId,
        documentIds: [documentId],
        topicOrder: preparation.topicOrder,
        approvalFingerprint: 'stale-fingerprint',
      })
      .expect(409);
  });

  it('enforces ownership and requires conflict acknowledgement when time is insufficient', async () => {
    await request(app)
      .get(`/api/exam-plans/${planId}/preparation`)
      .set(auth(intruderToken))
      .expect(403);

    const create = await request(app)
      .post('/api/exam-plans')
      .set(auth(ownerToken))
      .send({
        name: 'Overbooked Final',
        examDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        dailyStudyHours: 0.5,
        topics: [
          { name: 'Cell Biology', estimatedMinutes: 1440 },
          { name: 'Genetics', estimatedMinutes: 1440 },
        ],
      })
      .expect(201);
    const overbookedPlanId = create.body.examPlan.id as string;

    const preview = await request(app)
      .post(`/api/exam-plans/${overbookedPlanId}/preparation/preview`)
      .set(auth(ownerToken))
      .send({ spaceId, documentIds: [documentId] })
      .expect(200);

    expect(preview.body.preparation.requiresAcknowledgement).toBe(true);
    expect(preview.body.preparation.schedule.shortfallMinutes).toBeGreaterThan(0);

    const payload = {
      spaceId,
      documentIds: [documentId],
      topicOrder: preview.body.preparation.topicOrder,
      approvalFingerprint: preview.body.preparation.approvalFingerprint,
    };

    await request(app)
      .post(`/api/exam-plans/${overbookedPlanId}/preparation/approve`)
      .set(auth(ownerToken))
      .send(payload)
      .expect(409);

    const approved = await request(app)
      .post(`/api/exam-plans/${overbookedPlanId}/preparation/approve`)
      .set(auth(ownerToken))
      .send({ ...payload, acknowledgeConflicts: true })
      .expect(200);

    expect(approved.body.created).toBe(true);
    expect(
      approved.body.examPlan.preparation.shortfallMinutes,
    ).toBeGreaterThan(0);
  });
});
