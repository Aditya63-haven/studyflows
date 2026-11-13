import { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../../src/app';
import { Database } from '../../src/config/Database';
import { createContainer } from '../../src/container';
import { BookmarkModel } from '../../src/persistence/schemas/bookmark.schema';
import { ExamPlanModel } from '../../src/persistence/schemas/examPlan.schema';
import { FlashcardDeckModel } from '../../src/persistence/schemas/flashcardDeck.schema';
import { NoteModel } from '../../src/persistence/schemas/note.schema';
import { QuizAttemptModel } from '../../src/persistence/schemas/quizAttempt.schema';
import { QuizModel } from '../../src/persistence/schemas/quiz.schema';
import { SharedLinkModel } from '../../src/persistence/schemas/sharedLink.schema';

const DAY_MS = 24 * 60 * 60 * 1000;

const quizQuestions = [
  {
    type: 'mcq',
    prompt: 'Which traversal explores a graph level by level?',
    points: 2,
    options: [
      { id: 'bfs', text: 'Breadth-first search' },
      { id: 'dfs', text: 'Depth-first search' },
    ],
    correctOptionId: 'bfs',
  },
  {
    type: 'multi_select',
    prompt: 'Which of these are graph representations?',
    points: 2,
    options: [
      { id: 'adj', text: 'Adjacency list' },
      { id: 'heap', text: 'Binary heap' },
      { id: 'matrix', text: 'Adjacency matrix' },
    ],
    correctOptionIds: ['adj', 'matrix'],
  },
  {
    type: 'true_false',
    prompt: 'Every DAG has a topological order.',
    points: 1,
    correctAnswer: true,
  },
];

/**
 * End-to-end smoke test covering every documented endpoint (README) plus the
 * common error paths (400 validation, 401 unauthenticated, 403 other user's
 * data, 404 not found, 409 conflict).
 *
 * The `it` blocks run in declaration order and share state, mirroring a real
 * user journey: register -> create content -> study -> get feedback -> clean up.
 */
describe('API smoke test', () => {
  let mongo: MongoMemoryServer;
  let app: Express;

  let token: string;
  let otherToken: string;
  let spaceId: string;
  let noteId: string;
  let quizId: string;
  let deckId: string;
  let cardId: string;
  let planId: string;
  let examPlanId: string;

  const auth = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'integration-test-secret';
    process.env.AI_PROVIDER = 'mock';
    process.env.REVISION_STRATEGY = 'sm2';

    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('studyflows-smoke');

    await Database.getInstance().connect(process.env.MONGODB_URI);
    app = createApp(createContainer());
  }, 120_000);

  afterAll(async () => {
    await Database.getInstance().disconnect();
    await mongo.stop();
  });

  it('GET /api/health answers without authentication', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('auth: register, duplicate email, invalid body, login, wrong password, me', async () => {
    const credentials = {
      name: 'Smoke Tester',
      email: 'smoke@example.com',
      password: 'password123',
    };

    const registered = await request(app)
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);
    token = registered.body.token;
    expect(registered.body.user.email).toBe(credentials.email);
    expect(registered.body.user).not.toHaveProperty('passwordHash');

    await request(app).post('/api/auth/register').send(credentials).expect(409);

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad', email: 'not-an-email', password: 'short' })
      .expect(400);

    const logged = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
    expect(logged.body.token).toEqual(expect.any(String));

    await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' })
      .expect(401);

    const me = await request(app).get('/api/auth/me').set(auth(token)).expect(200);
    expect(me.body.user.email).toBe(credentials.email);

    await request(app).get('/api/auth/me').expect(401);
  });

  it('spaces: list, create, validation, get, update, 401/404', async () => {
    const empty = await request(app).get('/api/spaces').set(auth(token)).expect(200);
    expect(empty.body.spaces).toHaveLength(0);

    const created = await request(app)
      .post('/api/spaces')
      .set(auth(token))
      .send({ name: 'Mathematics', subject: 'Discrete Maths' })
      .expect(201);
    spaceId = created.body.space.id;
    expect(created.body.space.subject).toBe('Discrete Maths');

    await request(app)
      .post('/api/spaces')
      .set(auth(token))
      .send({ name: 'No subject' })
      .expect(400);

    const found = await request(app).get(`/api/spaces/${spaceId}`).set(auth(token)).expect(200);
    expect(found.body.space.name).toBe('Mathematics');

    await request(app).get('/api/spaces/unknown-id').set(auth(token)).expect(404);

    const updated = await request(app)
      .patch(`/api/spaces/${spaceId}`)
      .set(auth(token))
      .send({ description: 'Graphs and proofs' })
      .expect(200);
    expect(updated.body.space.description).toBe('Graphs and proofs');

    await request(app).get('/api/spaces').expect(401);
  });

  it('nested resources: create and list notes, quizzes and decks in a space', async () => {
    const note = await request(app)
      .post(`/api/spaces/${spaceId}/notes`)
      .set(auth(token))
      .send({
        title: 'Graph traversal notes',
        content:
          'Breadth-first search explores a graph level by level. Depth-first search follows one branch deeply.',
        tags: ['graphs'],
      })
      .expect(201);
    noteId = note.body.note.id;
    expect(note.body.note.spaceId).toBe(spaceId);

    const quiz = await request(app)
      .post(`/api/spaces/${spaceId}/quizzes`)
      .set(auth(token))
      .send({ title: 'Graph quiz', questions: quizQuestions, timeLimitMinutes: 10 })
      .expect(201);
    quizId = quiz.body.quiz.id;
    expect(quiz.body.quiz.questions).toHaveLength(3);
    expect(quiz.body.quiz.maxScore).toBe(5);

    const deck = await request(app)
      .post(`/api/spaces/${spaceId}/decks`)
      .set(auth(token))
      .send({
        title: 'Graph terms',
        cards: [
          { front: 'BFS', back: 'Breadth-first search' },
          { front: 'DFS', back: 'Depth-first search' },
        ],
      })
      .expect(201);
    deckId = deck.body.deck.id;
    cardId = deck.body.deck.cards[0].id;

    const notes = await request(app)
      .get(`/api/spaces/${spaceId}/notes`)
      .set(auth(token))
      .expect(200);
    expect(notes.body.notes).toHaveLength(1);

    const quizzes = await request(app)
      .get(`/api/spaces/${spaceId}/quizzes`)
      .set(auth(token))
      .expect(200);
    expect(quizzes.body.quizzes).toHaveLength(1);

    const decks = await request(app)
      .get(`/api/spaces/${spaceId}/decks`)
      .set(auth(token))
      .expect(200);
    expect(decks.body.decks).toHaveLength(1);

    await request(app)
      .post('/api/spaces/unknown-space/notes')
      .set(auth(token))
      .send({ title: 'Orphan' })
      .expect(404);

    await request(app)
      .post(`/api/spaces/${spaceId}/quizzes`)
      .set(auth(token))
      .send({ title: 'No questions', questions: [] })
      .expect(400);
  });

  it('a second user cannot access the first user data (403)', async () => {
    const other = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second Tester',
        email: 'smoke2@example.com',
        password: 'password123',
      })
      .expect(201);
    otherToken = other.body.token;

    await request(app).get(`/api/spaces/${spaceId}`).set(auth(otherToken)).expect(403);

    await request(app)
      .post(`/api/spaces/${spaceId}/notes`)
      .set(auth(otherToken))
      .send({ title: 'Hijack' })
      .expect(403);
  });

  it('notes: get, update, condense, generate quiz, 404/403', async () => {
    const found = await request(app).get(`/api/notes/${noteId}`).set(auth(token)).expect(200);
    expect(found.body.note.title).toBe('Graph traversal notes');

    await request(app)
      .patch(`/api/notes/${noteId}`)
      .set(auth(token))
      .send({ title: 'Graph traversal notes' })
      .expect(200);

    const condensed = await request(app)
      .post(`/api/notes/${noteId}/condense`)
      .set(auth(token))
      .expect(200);
    expect(condensed.body.note.aiSummary.length).toBeGreaterThan(0);

    const generated = await request(app)
      .post(`/api/notes/${noteId}/generate-quiz`)
      .set(auth(token))
      .expect(201);
    expect(generated.body.quiz.questions.length).toBeGreaterThan(0);

    await request(app).get('/api/notes/unknown-id').set(auth(token)).expect(404);
    await request(app).get(`/api/notes/${noteId}`).set(auth(otherToken)).expect(403);
    await request(app).get(`/api/notes/${noteId}`).expect(401);
  });

  it('quizzes: get, update, take attempt, list attempts, validation', async () => {
    await request(app).get(`/api/quizzes/${quizId}`).set(auth(token)).expect(200);

    await request(app)
      .patch(`/api/quizzes/${quizId}`)
      .set(auth(token))
      .send({ title: 'Graph quiz v2' })
      .expect(200);

    const quiz = (await request(app).get(`/api/quizzes/${quizId}`).set(auth(token)).expect(200))
      .body.quiz;
    const [mcq, multi, trueFalse] = quiz.questions;

    const attempt = await request(app)
      .post(`/api/quizzes/${quizId}/attempts`)
      .set(auth(token))
      .send({
        answers: [
          { questionId: mcq.id, response: mcq.correctOptionId },
          { questionId: multi.id, response: multi.correctOptionIds },
          { questionId: trueFalse.id, response: trueFalse.correctAnswer },
        ],
      })
      .expect(201);
    expect(attempt.body.attempt.percentage).toBe(100);

    const attempts = await request(app)
      .get(`/api/quizzes/${quizId}/attempts`)
      .set(auth(token))
      .expect(200);
    expect(attempts.body.attempts).toHaveLength(1);

    await request(app).post(`/api/quizzes/${quizId}/attempts`).set(auth(token)).send({}).expect(400);
    await request(app).get(`/api/quizzes/unknown-id`).set(auth(token)).expect(404);
  });

  it('decks: get, update, review a card, unknown card', async () => {
    await request(app).get(`/api/decks/${deckId}`).set(auth(token)).expect(200);

    await request(app)
      .patch(`/api/decks/${deckId}`)
      .set(auth(token))
      .send({ title: 'Graph terms v2' })
      .expect(200);

    const reviewed = await request(app)
      .post(`/api/decks/${deckId}/cards/${cardId}/review`)
      .set(auth(token))
      .send({ rating: 'good' })
      .expect(200);
    const reviewedCard = reviewed.body.deck.cards.find(
      (card: { id: string }) => card.id === cardId,
    );
    expect(reviewedCard.reviewCount).toBe(1);

    await request(app)
      .post(`/api/decks/${deckId}/cards/unknown-card/review`)
      .set(auth(token))
      .send({ rating: 'good' })
      .expect(404);

    await request(app)
      .post(`/api/decks/${deckId}/cards/${cardId}/review`)
      .set(auth(token))
      .send({ rating: 'superb' })
      .expect(400);
  });

  it('revision: schedules were created by the quiz attempt, dashboard and review work', async () => {
    const list = await request(app).get('/api/revision').set(auth(token)).expect(200);
    expect(list.body.schedules.length).toBeGreaterThanOrEqual(1);
    const scheduleId = list.body.schedules[0].id;

    const dashboard = await request(app)
      .get('/api/revision/dashboard')
      .set(auth(token))
      .expect(200);
    expect(dashboard.body.counts.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(dashboard.body.dueToday)).toBe(true);

    const reviewed = await request(app)
      .post(`/api/revision/${scheduleId}/review`)
      .set(auth(token))
      .send({ rating: 'good' })
      .expect(200);
    expect(reviewed.body.schedule.id).toBe(scheduleId);

    await request(app)
      .post('/api/revision/unknown-id/review')
      .set(auth(token))
      .send({ rating: 'good' })
      .expect(404);
  });

  it('exam plans: create, past date rejected, list, get, update, complete topic, 404', async () => {
    await request(app)
      .post('/api/exam-plans')
      .set(auth(token))
      .send({
        name: 'Past exam',
        examDate: new Date(Date.now() - DAY_MS).toISOString(),
        dailyStudyHours: 2,
        topics: [{ name: 'Old topic' }],
      })
      .expect(400);

    const plan = await request(app)
      .post('/api/exam-plans')
      .set(auth(token))
      .send({
        name: 'Graph Theory Final',
        examDate: new Date(Date.now() + 14 * DAY_MS).toISOString(),
        dailyStudyHours: 2,
        topics: [
          { name: 'Graph theory basics', estimatedMinutes: 120 },
          { name: 'Shortest paths', estimatedMinutes: 90 },
          { name: 'Spanning trees', estimatedMinutes: 60 },
        ],
      })
      .expect(201);
    planId = plan.body.examPlan.id;
    expect(plan.body.examPlan.daysRemaining).toBeGreaterThanOrEqual(13);
    expect(plan.body.examPlan.progress).toBe(0);
    expect(plan.body.examPlan.studyDays.length).toBeGreaterThan(0);

    const plans = await request(app).get('/api/exam-plans').set(auth(token)).expect(200);
    expect(plans.body.examPlans).toHaveLength(1);

    await request(app).get(`/api/exam-plans/${planId}`).set(auth(token)).expect(200);

    await request(app)
      .patch(`/api/exam-plans/${planId}`)
      .set(auth(token))
      .send({ name: 'Graph Theory Final Exam' })
      .expect(200);

    const planData = (
      await request(app).get(`/api/exam-plans/${planId}`).set(auth(token)).expect(200)
    ).body.examPlan;
    const topicId = planData.topics[0].id;
    const day = planData.studyDays.find((entry: { topicIds: string[] }) =>
      entry.topicIds.includes(topicId),
    );

    const marked = await request(app)
      .post(`/api/exam-plans/${planId}/topics/${topicId}/complete`)
      .set(auth(token))
      .send({ dayId: day.id })
      .expect(200);
    expect(marked.body.examPlan.progress).toBeGreaterThan(0);

    await request(app)
      .post(`/api/exam-plans/${planId}/topics/unknown-topic/complete`)
      .set(auth(token))
      .send({})
      .expect(404);

    const examPlan = await request(app)
      .post('/api/exam-plans')
      .set(auth(token))
      .send({
        name: 'Databases Quiz',
        examDate: new Date(Date.now() + 2 * DAY_MS).toISOString(),
        dailyStudyHours: 1,
        topics: [
          { name: 'SQL joins', estimatedMinutes: 60 },
          { name: 'Normalization', estimatedMinutes: 60 },
        ],
      })
      .expect(201);
    examPlanId = examPlan.body.examPlan.id;
  });

  it('analytics overview reflects the activity so far', async () => {
    const analytics = await request(app).get('/api/analytics').set(auth(token)).expect(200);
    expect(analytics.body.analytics.quizAttemptCount).toBeGreaterThanOrEqual(1);
    expect(analytics.body.analytics.subjectBreakdown).toEqual(expect.any(Array));
    expect(analytics.body.analytics).toHaveProperty('totalStudyMinutes');
    expect(analytics.body.analytics).toHaveProperty('streakDays');
  });

  it('sessions: create, list, unknown space, validation', async () => {
    const created = await request(app)
      .post('/api/sessions')
      .set(auth(token))
      .send({ spaceId, durationMinutes: 45 })
      .expect(201);
    expect(created.body.session.subject).toBe('Discrete Maths');

    const sessions = await request(app).get('/api/sessions').set(auth(token)).expect(200);
    expect(sessions.body.sessions.length).toBeGreaterThanOrEqual(1);

    await request(app)
      .post('/api/sessions')
      .set(auth(token))
      .send({ spaceId: 'unknown-space', durationMinutes: 30 })
      .expect(404);

    await request(app)
      .post('/api/sessions')
      .set(auth(token))
      .send({ durationMinutes: 0 })
      .expect(400);
  });

  it('availability: default week, save week, save single day, invalid weekday', async () => {
    const initial = await request(app).get('/api/availability').set(auth(token)).expect(200);
    expect(initial.body.availability.days).toHaveLength(7);

    const week = Array.from({ length: 7 }, () => ({
      mode: 'budget',
      budgetMinutes: 120,
      available: true,
      windows: [],
    }));
    await request(app).put('/api/availability').set(auth(token)).send({ days: week }).expect(200);

    const day = await request(app)
      .put('/api/availability/6')
      .set(auth(token))
      .send({ mode: 'budget', budgetMinutes: 240, available: true, windows: [] })
      .expect(200);
    expect(day.body.availability.days[6].budgetMinutes).toBe(240);

    await request(app)
      .put('/api/availability/7')
      .set(auth(token))
      .send({ mode: 'budget', budgetMinutes: 120, available: true, windows: [] })
      .expect(400);
  });

  it('attention: reports missed sessions and approaching exams, applies strategies', async () => {
    const planData = (
      await request(app).get(`/api/exam-plans/${planId}`).set(auth(token)).expect(200)
    ).body.examPlan;
    const missedDay = planData.studyDays.find(
      (entry: { id: string; topicIds: string[]; completedTopicIds: string[] }) =>
        entry.topicIds.some((topicId: string) => !entry.completedTopicIds.includes(topicId)),
    );
    expect(missedDay).toBeDefined();
    const firstDayId = missedDay.id;

    // Simulate a missed study day by moving the first day into the past.
    await ExamPlanModel.updateOne(
      { _id: planId, 'studyDays._id': firstDayId },
      { $set: { 'studyDays.$.date': new Date(Date.now() - DAY_MS) } },
    );

    const report = await request(app).get('/api/attention').set(auth(token)).expect(200);
    const items = report.body.attention.items;
    const missedItem = items.find((item: { type: string }) => item.type === 'missed-session');
    const examItem = items.find((item: { type: string }) => item.type === 'exam-approaching');

    expect(missedItem.id).toBe(`missed:${planId}:${firstDayId}`);
    expect(missedItem.suggestions).toHaveLength(2);
    expect(examItem.id).toBe(`exam:${examPlanId}`);

    const applied = await request(app)
      .post(`/api/attention/${missedItem.id}/apply`)
      .set(auth(token))
      .send({ strategy: 'weekend' })
      .expect(200);
    expect(applied.body.applied.movedTopicIds.length).toBeGreaterThan(0);

    const examApplied = await request(app)
      .post(`/api/attention/${examItem.id}/apply`)
      .set(auth(token))
      .send({ strategy: 'next-free-slot' })
      .expect(200);
    expect(examApplied.body.applied.itemId).toBe(`exam:${examPlanId}`);

    await request(app)
      .post('/api/attention/garbage/apply')
      .set(auth(token))
      .send({ strategy: 'weekend' })
      .expect(400);

    await request(app)
      .post(`/api/attention/exam:${examPlanId}/apply`)
      .set(auth(token))
      .send({ strategy: 'whenever' })
      .expect(400);
  });

  it('assistant: topic keywords and subject detection, apply, clarifying answers', async () => {
    // Topic names are matched, not just the plan name.
    const proposal = await request(app)
      .post('/api/assistant/command')
      .set(auth(token))
      .send({ text: 'move the spanning trees work to the weekend' })
      .expect(200);
    expect(proposal.body.proposal.understood).toBe(true);
    expect(proposal.body.proposal.planId).toBe(planId);
    expect(proposal.body.proposal.strategy).toBe('weekend');
    expect(proposal.body.proposal.needsConfirmation).toBe(true);

    const applied = await request(app)
      .post('/api/assistant/apply')
      .set(auth(token))
      .send({ planId, strategy: 'weekend' })
      .expect(200);
    expect(applied.body.applied.itemId).toBe(`exam:${planId}`);

    // A subject that matches a study space but no plan produces a clear answer.
    const clarified = await request(app)
      .post('/api/assistant/command')
      .set(auth(token))
      .send({ text: 'move unfinished maths work to the weekend' })
      .expect(200);
    expect(clarified.body.proposal.understood).toBe(false);
    expect(clarified.body.proposal.response).toContain('Mathematics');

    // A user without plans gets a dedicated answer.
    const empty = await request(app)
      .post('/api/assistant/command')
      .set(auth(otherToken))
      .send({ text: 'move my work to the weekend' })
      .expect(200);
    expect(empty.body.proposal.understood).toBe(false);
    expect(empty.body.proposal.response).toContain('do not have any exam plans');

    const unclear = await request(app)
      .post('/api/assistant/command')
      .set(auth(token))
      .send({ text: 'hello there' })
      .expect(200);
    expect(unclear.body.proposal.understood).toBe(false);

    await request(app)
      .post('/api/assistant/command')
      .set(auth(token))
      .send({ text: '' })
      .expect(400);
  });

  it('notifications: listed after events, marked read, 404', async () => {
    const list = await request(app).get('/api/notifications').set(auth(token)).expect(200);
    expect(list.body.notifications.length).toBeGreaterThanOrEqual(1);
    expect(list.body.unreadCount).toBeGreaterThanOrEqual(1);

    const notificationId = list.body.notifications[0].id;
    const marked = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set(auth(token))
      .expect(200);
    expect(marked.body.notification.read).toBe(true);

    await request(app).patch('/api/notifications/unknown/read').set(auth(token)).expect(404);
  });

  it('bookmarks: create, list, unknown item, invalid type, delete', async () => {
    const created = await request(app)
      .post('/api/bookmarks')
      .set(auth(token))
      .send({ itemId: noteId, itemType: 'note' })
      .expect(201);
    const bookmarkId = created.body.bookmark.id;
    expect(created.body.bookmark.title).toBe('Graph traversal notes');

    const list = await request(app).get('/api/bookmarks').set(auth(token)).expect(200);
    expect(list.body.bookmarks.length).toBeGreaterThanOrEqual(1);

    await request(app)
      .post('/api/bookmarks')
      .set(auth(token))
      .send({ itemId: 'unknown-id', itemType: 'note' })
      .expect(404);

    await request(app)
      .post('/api/bookmarks')
      .set(auth(token))
      .send({ itemId: noteId, itemType: 'video' })
      .expect(400);

    await request(app).delete(`/api/bookmarks/${bookmarkId}`).set(auth(token)).expect(204);
  });

  it('search: finds items and requires the q parameter', async () => {
    const results = await request(app)
      .get('/api/search')
      .query({ q: 'graph' })
      .set(auth(token))
      .expect(200);
    expect(results.body.results.length).toBeGreaterThanOrEqual(1);

    await request(app).get('/api/search').set(auth(token)).expect(400);
  });

  it('sharing: share note and quiz, public access, public attempt, revoke', async () => {
    const noteShare = await request(app)
      .post(`/api/share/notes/${noteId}`)
      .set(auth(token))
      .expect(201);
    const noteToken = noteShare.body.share.token;

    const quizShare = await request(app)
      .post(`/api/share/quizzes/${quizId}`)
      .set(auth(token))
      .expect(201);
    const quizToken = quizShare.body.share.token;

    const publicNote = await request(app).get(`/api/public/notes/${noteToken}`).expect(200);
    expect(publicNote.body.note.id).toBe(noteId);

    const publicQuiz = await request(app).get(`/api/public/quizzes/${quizToken}`).expect(200);
    expect(publicQuiz.body.quiz.id).toBe(quizId);
    expect(publicQuiz.body.quiz.questions[0]).not.toHaveProperty('correctOptionId');

    const publicAttempt = await request(app)
      .post(`/api/public/quizzes/${quizToken}/attempts`)
      .send({
        answers: [
          { questionId: publicQuiz.body.quiz.questions[0].id, response: 'bfs' },
        ],
      })
      .expect(200);
    expect(publicAttempt.body.result).toHaveProperty('score');

    await request(app).get('/api/public/notes/unknown-token').expect(404);

    await request(app).delete(`/api/share/${quizToken}`).set(auth(token)).expect(204);
    await request(app).get(`/api/public/quizzes/${quizToken}`).expect(404);

    await request(app).delete(`/api/share/${noteToken}`).set(auth(otherToken)).expect(403);
  });

  it('deleting a quiz removes its attempts, bookmarks and share links', async () => {
    await request(app)
      .post('/api/bookmarks')
      .set(auth(token))
      .send({ itemId: quizId, itemType: 'quiz' })
      .expect(201);

    expect(await QuizAttemptModel.countDocuments({ quizId })).toBeGreaterThanOrEqual(1);
    expect(await SharedLinkModel.countDocuments({ itemId: quizId, itemType: 'quiz' })).toBe(1);

    await request(app).delete(`/api/quizzes/${quizId}`).set(auth(token)).expect(204);

    await request(app).get(`/api/quizzes/${quizId}`).set(auth(token)).expect(404);
    expect(await QuizAttemptModel.countDocuments({ quizId })).toBe(0);
    expect(await BookmarkModel.countDocuments({ itemId: quizId, itemType: 'quiz' })).toBe(0);
    expect(await SharedLinkModel.countDocuments({ itemId: quizId, itemType: 'quiz' })).toBe(0);
  });

  it('deleting a note removes its bookmarks and share links', async () => {
    await request(app)
      .post('/api/bookmarks')
      .set(auth(token))
      .send({ itemId: noteId, itemType: 'note' })
      .expect(201);
    await request(app).post(`/api/share/notes/${noteId}`).set(auth(token)).expect(201);

    await request(app).delete(`/api/notes/${noteId}`).set(auth(token)).expect(204);

    await request(app).get(`/api/notes/${noteId}`).set(auth(token)).expect(404);
    expect(await BookmarkModel.countDocuments({ itemId: noteId, itemType: 'note' })).toBe(0);
    expect(await SharedLinkModel.countDocuments({ itemId: noteId, itemType: 'note' })).toBe(0);
  });

  it('deleting a space cascades to all its content and dependent records', async () => {
    const cascadeSpace = await request(app)
      .post('/api/spaces')
      .set(auth(token))
      .send({ name: 'Databases', subject: 'Information Systems' })
      .expect(201);
    const cascadeSpaceId = cascadeSpace.body.space.id;

    const cascadeNote = await request(app)
      .post(`/api/spaces/${cascadeSpaceId}/notes`)
      .set(auth(token))
      .send({
        title: 'Normalization notes',
        content: 'Third normal form removes transitive dependencies.',
      })
      .expect(201);
    const cascadeQuiz = await request(app)
      .post(`/api/spaces/${cascadeSpaceId}/quizzes`)
      .set(auth(token))
      .send({ title: 'SQL quiz', questions: [quizQuestions[0]] })
      .expect(201);
    const cascadeDeck = await request(app)
      .post(`/api/spaces/${cascadeSpaceId}/decks`)
      .set(auth(token))
      .send({ title: 'SQL terms', cards: [{ front: 'JOIN', back: 'Combines rows' }] })
      .expect(201);

    const noteId2 = cascadeNote.body.note.id;
    const quizId2 = cascadeQuiz.body.quiz.id;
    const deckId2 = cascadeDeck.body.deck.id;

    await request(app)
      .post('/api/bookmarks')
      .set(auth(token))
      .send({ itemId: noteId2, itemType: 'note' })
      .expect(201);
    await request(app)
      .post('/api/bookmarks')
      .set(auth(token))
      .send({ itemId: quizId2, itemType: 'quiz' })
      .expect(201);
    await request(app)
      .post('/api/bookmarks')
      .set(auth(token))
      .send({ itemId: deckId2, itemType: 'flashcarddeck' })
      .expect(201);

    const noteLink = await request(app)
      .post(`/api/share/notes/${noteId2}`)
      .set(auth(token))
      .expect(201);
    await request(app).post(`/api/share/quizzes/${quizId2}`).set(auth(token)).expect(201);

    await request(app)
      .post(`/api/quizzes/${quizId2}/attempts`)
      .set(auth(token))
      .send({
        answers: [
          {
            questionId: cascadeQuiz.body.quiz.questions[0].id,
            response: cascadeQuiz.body.quiz.questions[0].correctOptionId,
          },
        ],
      })
      .expect(201);

    await request(app).delete(`/api/spaces/${cascadeSpaceId}`).set(auth(token)).expect(204);

    expect(await NoteModel.countDocuments({ space: cascadeSpaceId })).toBe(0);
    expect(await QuizModel.countDocuments({ space: cascadeSpaceId })).toBe(0);
    expect(await FlashcardDeckModel.countDocuments({ space: cascadeSpaceId })).toBe(0);
    expect(await QuizAttemptModel.countDocuments({ quizId: quizId2 })).toBe(0);
    expect(
      await BookmarkModel.countDocuments({ itemId: { $in: [noteId2, quizId2, deckId2] } }),
    ).toBe(0);
    expect(await SharedLinkModel.countDocuments({ itemId: { $in: [noteId2, quizId2] } })).toBe(0);

    await request(app)
      .get(`/api/public/notes/${noteLink.body.share.token}`)
      .expect(404);

    const spaces = await request(app).get('/api/spaces').set(auth(token)).expect(200);
    expect(spaces.body.spaces.some((space: { id: string }) => space.id === cascadeSpaceId)).toBe(
      false,
    );
  });

  it('exam plans: delete and ownership checks', async () => {
    await request(app).delete(`/api/exam-plans/${examPlanId}`).set(auth(otherToken)).expect(403);
    await request(app).delete(`/api/exam-plans/${examPlanId}`).set(auth(token)).expect(204);
    await request(app).get(`/api/exam-plans/${examPlanId}`).set(auth(token)).expect(404);
    await request(app).delete(`/api/exam-plans/${planId}`).set(auth(token)).expect(204);
  });
});
