import { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { Database } from '../../src/config/Database';
import { createContainer } from '../../src/container';

describe('invite-only AI access', () => {
  let mongo: MongoMemoryServer;
  let app: Express;
  let adminToken: string;
  let memberToken: string;
  let spaceId: string;
  let noteId: string;
  let memberGrantId: string;

  const auth = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'ai-access-test-secret';
    process.env.AI_PROVIDER = 'mock';
    process.env.AI_ACCESS_ADMIN_EMAIL = 'admin@example.com';
    process.env.AI_USER_REQUESTS_PER_MINUTE = '100';
    process.env.AI_GLOBAL_REQUESTS_PER_MINUTE = '100';
    process.env.REVISION_STRATEGY = 'sm2';

    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('studyflows-ai-access');

    await Database.getInstance().connect(process.env.MONGODB_URI);
    app = createApp(createContainer());
  }, 120_000);

  afterAll(async () => {
    await Database.getInstance().disconnect();
    await mongo.stop();
  });

  it('registers the configured admin and an uninvited member', async () => {
    const admin = await request(app)
      .post('/api/auth/register')
      .send({ name: 'AI Admin', email: 'admin@example.com', password: 'password123' })
      .expect(201);
    adminToken = admin.body.token;

    const member = await request(app)
      .post('/api/auth/register')
      .send({ name: 'AI Member', email: 'member@example.com', password: 'password123' })
      .expect(201);
    memberToken = member.body.token;

    const adminStatus = await request(app)
      .get('/api/ai-access/status')
      .set(auth(adminToken))
      .expect(200);
    expect(adminStatus.body.status).toMatchObject({
      allowed: true,
      isAdmin: true,
      status: 'admin',
    });

    const memberStatus = await request(app)
      .get('/api/ai-access/status')
      .set(auth(memberToken))
      .expect(200);
    expect(memberStatus.body.status).toMatchObject({
      allowed: false,
      isAdmin: false,
      status: 'none',
    });
  });

  it('blocks every AI-backed action until access is granted', async () => {
    const space = await request(app)
      .post('/api/spaces')
      .set(auth(memberToken))
      .send({ name: 'Algorithms', subject: 'Computer Science' })
      .expect(201);
    spaceId = space.body.space.id;

    const note = await request(app)
      .post(`/api/spaces/${spaceId}/notes`)
      .set(auth(memberToken))
      .send({
        title: 'Graph traversal',
        content: 'Breadth-first search explores a graph level by level.',
      })
      .expect(201);
    noteId = note.body.note.id;

    await request(app)
      .post('/api/assistant/chat')
      .set(auth(memberToken))
      .send({ message: 'What is breadth-first search?' })
      .expect(403);

    await request(app)
      .post('/api/assistant/command')
      .set(auth(memberToken))
      .send({ text: 'move work to the weekend' })
      .expect(403);

    await request(app)
      .post(`/api/notes/${noteId}/condense`)
      .set(auth(memberToken))
      .expect(403);

    await request(app)
      .post(`/api/notes/${noteId}/generate-quiz`)
      .set(auth(memberToken))
      .expect(403);
  });

  it('allows only the admin to list, grant and revoke invites', async () => {
    await request(app)
      .get('/api/ai-access/grants')
      .set(auth(memberToken))
      .expect(403);

    await request(app)
      .post('/api/ai-access/grants')
      .set(auth(memberToken))
      .send({ email: 'pending@example.com' })
      .expect(403);

    const pending = await request(app)
      .post('/api/ai-access/grants')
      .set(auth(adminToken))
      .send({ email: ' Pending@Example.com ' })
      .expect(201);
    expect(pending.body.grant).toMatchObject({
      email: 'pending@example.com',
      status: 'pending',
    });

    await request(app)
      .post('/api/ai-access/grants')
      .set(auth(adminToken))
      .send({ email: 'pending@example.com' })
      .expect(409);

    const memberGrant = await request(app)
      .post('/api/ai-access/grants')
      .set(auth(adminToken))
      .send({ email: 'member@example.com' })
      .expect(201);
    memberGrantId = memberGrant.body.grant.id;
    expect(memberGrant.body.grant.status).toBe('registered');

    const list = await request(app)
      .get('/api/ai-access/grants')
      .set(auth(adminToken))
      .expect(200);
    expect(list.body.grants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: 'pending@example.com', status: 'pending' }),
        expect.objectContaining({ email: 'member@example.com', status: 'registered' }),
      ]),
    );

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Pending User', email: 'pending@example.com', password: 'password123' })
      .expect(201);

    const updatedList = await request(app)
      .get('/api/ai-access/grants')
      .set(auth(adminToken))
      .expect(200);
    expect(
      updatedList.body.grants.find(
        (grant: { email: string }) => grant.email === 'pending@example.com',
      ).status,
    ).toBe('registered');

    const status = await request(app)
      .get('/api/ai-access/status')
      .set(auth(memberToken))
      .expect(200);
    expect(status.body.status).toMatchObject({ allowed: true, status: 'active' });
  });

  it('revocation takes effect immediately and can be re-granted', async () => {
    await request(app)
      .delete(`/api/ai-access/grants/${memberGrantId}`)
      .set(auth(adminToken))
      .expect(200);

    const revoked = await request(app)
      .get('/api/ai-access/status')
      .set(auth(memberToken))
      .expect(200);
    expect(revoked.body.status).toMatchObject({ allowed: false, status: 'revoked' });

    await request(app)
      .post('/api/assistant/chat')
      .set(auth(memberToken))
      .send({ message: 'What is breadth-first search?' })
      .expect(403);

    const regranted = await request(app)
      .post('/api/ai-access/grants')
      .set(auth(adminToken))
      .send({ email: 'member@example.com' })
      .expect(201);
    expect(regranted.body.grant.status).toBe('registered');
  });

  it('answers from selected notes and allows the other AI features after access', async () => {
    const chat = await request(app)
      .post('/api/assistant/chat')
      .set(auth(memberToken))
      .send({
        message: 'What is breadth-first search?',
        mode: 'answer',
        spaceId,
        noteIds: [noteId],
        history: [],
      })
      .expect(200);

    expect(chat.body.result.provider).toBe('mock');
    expect(chat.body.result.noteCount).toBe(1);
    expect(chat.body.result.answer).toContain('Graph traversal');
    expect(chat.body.result.citations).toEqual([
      { id: noteId, title: 'Graph traversal' },
    ]);

    const condensed = await request(app)
      .post(`/api/notes/${noteId}/condense`)
      .set(auth(memberToken))
      .expect(200);
    expect(condensed.body.note.aiSummary.length).toBeGreaterThan(0);

    const generated = await request(app)
      .post(`/api/notes/${noteId}/generate-quiz`)
      .set(auth(memberToken))
      .expect(201);
    expect(generated.body.quiz.questions.length).toBeGreaterThan(0);
  });

  it("rejects another user's space and notes in chat context", async () => {
    const adminSpace = await request(app)
      .post('/api/spaces')
      .set(auth(adminToken))
      .send({ name: 'Private Admin Space', subject: 'Security' })
      .expect(201);
    const adminSpaceId = adminSpace.body.space.id;

    const adminNote = await request(app)
      .post(`/api/spaces/${adminSpaceId}/notes`)
      .set(auth(adminToken))
      .send({ title: 'Secret', content: 'Only the admin can read this.' })
      .expect(201);
    const adminNoteId = adminNote.body.note.id;

    await request(app)
      .post('/api/assistant/chat')
      .set(auth(memberToken))
      .send({ message: 'Summarize this', spaceId: adminSpaceId })
      .expect(403);

    await request(app)
      .post('/api/assistant/chat')
      .set(auth(memberToken))
      .send({
        message: 'Summarize this',
        spaceId,
        noteIds: [adminNoteId],
      })
      .expect(403);
  });

  it('validates chat input and returns 404 for unknown grants', async () => {
    await request(app)
      .post('/api/assistant/chat')
      .set(auth(memberToken))
      .send({ message: '' })
      .expect(400);

    await request(app)
      .post('/api/assistant/chat')
      .set(auth(memberToken))
      .send({ message: 'Valid', mode: 'invalid' })
      .expect(400);

    await request(app)
      .delete('/api/ai-access/grants/unknown-grant')
      .set(auth(adminToken))
      .expect(404);
  });
});
