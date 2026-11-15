import { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { Database } from '../../src/config/Database';
import { createContainer } from '../../src/container';

describe('performance intelligence API', () => {
  let mongo: MongoMemoryServer;
  let app: Express;
  let token: string;
  let quizId: string;

  const auth = { Authorization: '' };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'performance-test-secret';
    process.env.AI_PROVIDER = 'mock';
    process.env.REVISION_STRATEGY = 'sm2';
    process.env.AI_ACCESS_ADMIN_EMAIL = 'performance-admin@example.com';
    process.env.AI_USER_REQUESTS_PER_MINUTE = '100';
    process.env.AI_GLOBAL_REQUESTS_PER_MINUTE = '100';

    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('studyflows-performance');

    await Database.getInstance().connect(process.env.MONGODB_URI);
    app = createApp(createContainer());
  }, 120_000);

  afterAll(async () => {
    await Database.getInstance().disconnect();
    await mongo.stop();
  });

  it('registers an admin and records graded attempts', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Performance Admin',
        email: 'performance-admin@example.com',
        password: 'password123',
      })
      .expect(201);
    token = register.body.token as string;
    auth.Authorization = `Bearer ${token}`;

    const space = await request(app)
      .post('/api/spaces')
      .set(auth)
      .send({ name: 'Biology', subject: 'Biology' })
      .expect(201);

    const quiz = await request(app)
      .post(`/api/spaces/${space.body.space.id}/quizzes`)
      .set(auth)
      .send({
        title: 'Cell Biology',
        questions: Array.from({ length: 5 }, (_, index) => ({
          type: 'true_false',
          prompt: `Cell statement ${index + 1}`,
          correctAnswer: true,
        })),
      })
      .expect(201);

    quizId = quiz.body.quiz.id as string;
    const questions = quiz.body.quiz.questions as Array<{
      id: string;
      correctAnswer: boolean;
    }>;

    await request(app)
      .post(`/api/quizzes/${quizId}/attempts`)
      .set(auth)
      .send({
        answers: questions.map((question, index) => ({
          questionId: question.id,
          response: index < 2 ? question.correctAnswer : !question.correctAnswer,
        })),
      })
      .expect(201);
  }, 30_000);

  it('returns deterministic analysis and recommendations', async () => {
    const response = await request(app)
      .get('/api/analytics/performance?days=30')
      .set(auth)
      .expect(200);

    const report = response.body.report;
    expect(report.analysis.overall.accuracy).toBe(40);
    expect(report.analysis.overall.answeredQuestions).toBe(5);
    expect(report.analysis.dataQuality.reliable).toBe(true);
    expect(report.analysis.weakTopics[0]).toMatchObject({
      topicId: quizId,
      accuracy: 40,
      classification: 'weak',
    });
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: `weak:${quizId}`, addable: false }),
      ]),
    );
    expect(report.analysis.dataQuality.limitations.join(' ')).toContain(
      'topic tags',
    );
  });

  it('accepts a recommendation idempotently', async () => {
    const accepted = await request(app)
      .post(`/api/analytics/performance/recommendations/weak:${quizId}/accept?days=30`)
      .set(auth)
      .expect(200);

    expect(accepted.body.created).toBe(false);
    expect(accepted.body.schedule.topicId).toBe(quizId);

    await request(app)
      .post('/api/analytics/performance/recommendations/weak:missing/accept?days=30')
      .set(auth)
      .expect(404);

    await request(app)
      .get('/api/analytics/performance?from=2026-05-10&to=2026-05-01')
      .set(auth)
      .expect(400);
  });

  it('interprets performance with the AI provider and grounds topic ids', async () => {
    const response = await request(app)
      .post('/api/assistant/performance')
      .set(auth)
      .send({ days: 30 })
      .expect(200);

    expect(response.body.result).toMatchObject({
      provider: 'mock',
      dataQuality: { reliable: true, answeredQuestions: 5 },
    });
    expect(response.body.result.summary).toContain('5 graded questions');
    expect(response.body.result.focusTopics).toEqual([
      expect.objectContaining({ topicId: quizId, topicName: 'Cell Biology' }),
    ]);
    expect(response.body.result.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: `weak:${quizId}` }),
      ]),
    );
  });
});
