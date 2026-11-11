import { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { Database } from '../../src/config/Database';
import { createContainer } from '../../src/container';

describe('quiz attempt API flow', () => {
  let mongo: MongoMemoryServer;
  let app: Express;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'integration-test-secret';
    process.env.AI_PROVIDER = 'mock';
    process.env.REVISION_STRATEGY = 'sm2';

    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('studyflows-test');

    await Database.getInstance().connect(process.env.MONGODB_URI);
    app = createApp(createContainer());
  }, 120_000);

  afterAll(async () => {
    await Database.getInstance().disconnect();
    await mongo.stop();
  });

  it('registers, logs in, creates a quiz and grades an attempt', async () => {
    const credentials = {
      name: 'Demo Learner',
      email: 'learner@example.com',
      password: 'password123',
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);

    expect(registerResponse.body.token).toEqual(expect.any(String));
    expect(registerResponse.body.user.email).toBe(credentials.email);
    expect(registerResponse.body.user).not.toHaveProperty('passwordHash');

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    const token = loginResponse.body.token as string;
    expect(token).toEqual(expect.any(String));

    const spaceResponse = await request(app)
      .post('/api/spaces')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Algorithms',
        subject: 'Computer Science',
        description: 'Practice space for the integration test',
      })
      .expect(201);

    const spaceId = spaceResponse.body.space.id as string;

    const quizResponse = await request(app)
      .post(`/api/spaces/${spaceId}/quizzes`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Algorithms Check',
        description: 'Mixed question quiz',
        questions: [
          {
            type: 'mcq',
            prompt: 'Which structure uses FIFO ordering?',
            points: 2,
            options: [
              { id: 'queue', text: 'Queue' },
              { id: 'stack', text: 'Stack' },
            ],
            correctOptionId: 'queue',
          },
          {
            type: 'multi_select',
            prompt: 'Which are sorting algorithms?',
            points: 2,
            options: [
              { id: 'merge', text: 'Merge sort' },
              { id: 'binary', text: 'Binary search' },
              { id: 'quick', text: 'Quick sort' },
            ],
            correctOptionIds: ['merge', 'quick'],
          },
          {
            type: 'true_false',
            prompt: 'A binary search requires sorted input.',
            points: 1,
            correctAnswer: true,
          },
        ],
      })
      .expect(201);

    const quiz = quizResponse.body.quiz;
    const quizId = quiz.id as string;
    expect(quiz.questions).toHaveLength(3);

    const [mcq, multi, trueFalse] = quiz.questions as Array<{
      id: string;
      correctOptionId?: string;
      correctOptionIds?: string[];
      correctAnswer?: boolean;
    }>;

    const attemptResponse = await request(app)
      .post(`/api/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: [
          { questionId: mcq.id, response: mcq.correctOptionId },
          { questionId: multi.id, response: multi.correctOptionIds },
          { questionId: trueFalse.id, response: trueFalse.correctAnswer },
        ],
      })
      .expect(201);

    expect(attemptResponse.body.attempt.score).toBe(5);
    expect(attemptResponse.body.attempt.maxScore).toBe(5);
    expect(attemptResponse.body.attempt.percentage).toBe(100);
    expect(attemptResponse.body.attempt.quizId).toBe(quizId);

    const attemptsResponse = await request(app)
      .get(`/api/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(attemptsResponse.body.attempts).toHaveLength(1);
    expect(attemptsResponse.body.attempts[0].percentage).toBe(100);
  }, 30_000);
});
