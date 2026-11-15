import { Express } from 'express';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { Database } from '../../src/config/Database';
import { createContainer } from '../../src/container';
import { DocumentChunkModel } from '../../src/persistence/schemas/documentChunk.schema';

describe('academic document ingestion and assistant context', () => {
  let mongo: MongoMemoryServer;
  let app: Express;
  let storageDir: string;
  let ownerToken: string;
  let intruderToken: string;
  let spaceId: string;
  let documentId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const documentText =
    'Photosynthesis converts light energy into chemical energy in chloroplasts. ' +
    'The Calvin cycle fixes carbon dioxide into glucose.';

  beforeAll(async () => {
    storageDir = await mkdtemp(join(tmpdir(), 'studyflows-documents-'));
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'document-ingestion-test-secret';
    process.env.AI_PROVIDER = 'mock';
    process.env.AI_ACCESS_ADMIN_EMAIL = 'owner@example.com';
    process.env.AI_USER_REQUESTS_PER_MINUTE = '100';
    process.env.AI_GLOBAL_REQUESTS_PER_MINUTE = '100';
    process.env.DOCUMENT_STORAGE_DIR = storageDir;
    process.env.DOCUMENT_MAX_BYTES = '1048576';

    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('studyflows-documents');

    await Database.getInstance().connect(process.env.MONGODB_URI);
    app = createApp(createContainer());

    const owner = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Owner', email: 'owner@example.com', password: 'password123' })
      .expect(201);
    ownerToken = owner.body.token;

    const intruder = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Intruder', email: 'intruder@example.com', password: 'password123' })
      .expect(201);
    intruderToken = intruder.body.token;

    const space = await request(app)
      .post('/api/spaces')
      .set(auth(ownerToken))
      .send({ name: 'Biology', subject: 'Cell biology' })
      .expect(201);
    spaceId = space.body.space.id;
  }, 120_000);

  afterAll(async () => {
    await Database.getInstance().disconnect();
    await mongo.stop();
    await rm(storageDir, { recursive: true, force: true });
  });

  it('uploads a text document, stores chunks and lists readiness', async () => {
    const upload = await request(app)
      .post(`/api/spaces/${spaceId}/documents`)
      .set(auth(ownerToken))
      .attach('file', Buffer.from(documentText), {
        filename: 'lecture-notes.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    const document = upload.body.document;
    expect(document).toMatchObject({
      type: 'document',
      spaceId,
      originalName: 'lecture-notes.txt',
      format: 'txt',
      status: 'ready',
    });
    expect(document.chunkCount).toBeGreaterThan(0);
    expect(document.characterCount).toBeGreaterThan(0);
    expect(document).not.toHaveProperty('storageKey');
    documentId = document.id;

    const listed = await request(app)
      .get(`/api/spaces/${spaceId}/documents`)
      .set(auth(ownerToken))
      .expect(200);
    expect(listed.body.documents).toHaveLength(1);
    expect(listed.body.documents[0].id).toBe(documentId);

    await request(app)
      .get(`/api/documents/${documentId}/file`)
      .set(auth(ownerToken))
      .expect(200)
      .expect('Content-Type', /text\/plain/);
  });

  it('rejects mismatched or invalid document content', async () => {
    await request(app)
      .post(`/api/spaces/${spaceId}/documents`)
      .set(auth(ownerToken))
      .attach('file', Buffer.from('plain text'), {
        filename: 'spoofed.txt',
        contentType: 'application/pdf',
      })
      .expect(400);

    await request(app)
      .post(`/api/spaces/${spaceId}/documents`)
      .set(auth(ownerToken))
      .attach('file', Buffer.from('not really a pdf'), {
        filename: 'broken.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);

    await request(app)
      .post(`/api/spaces/${spaceId}/documents`)
      .set(auth(ownerToken))
      .attach('file', Buffer.from('plain text'), {
        filename: 'slides.pptx',
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      })
      .expect(400);
  });

  it('enforces strict ownership on document routes', async () => {
    await request(app)
      .get(`/api/documents/${documentId}`)
      .set(auth(intruderToken))
      .expect(403);

    await request(app)
      .get(`/api/documents/${documentId}/file`)
      .set(auth(intruderToken))
      .expect(403);

    await request(app)
      .delete(`/api/documents/${documentId}`)
      .set(auth(intruderToken))
      .expect(403);
  });

  it('grounds assistant answers in selected documents and cites pages', async () => {
    const response = await request(app)
      .post('/api/assistant/chat')
      .set(auth(ownerToken))
      .send({
        message: 'What does photosynthesis do?',
        mode: 'answer',
        spaceId,
        noteIds: [],
        documentIds: [documentId],
        history: [],
      })
      .expect(200);

    const result = response.body.result;
    expect(result.provider).toBe('mock');
    expect(result.documentCount).toBe(1);
    expect(result.answer.toLowerCase()).toContain('photosynthesis');
    expect(result.documentCitations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId,
          title: 'lecture-notes.txt',
        }),
      ]),
    );
  });

  it('deletes the document together with its chunks and stored file', async () => {
    await request(app)
      .delete(`/api/documents/${documentId}`)
      .set(auth(ownerToken))
      .expect(204);

    await request(app)
      .get(`/api/documents/${documentId}`)
      .set(auth(ownerToken))
      .expect(404);

    expect(await DocumentChunkModel.countDocuments({ document: documentId })).toBe(0);

    const listed = await request(app)
      .get(`/api/spaces/${spaceId}/documents`)
      .set(auth(ownerToken))
      .expect(200);
    expect(listed.body.documents).toHaveLength(0);
  });
});
