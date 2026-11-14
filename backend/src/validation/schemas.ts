import { z } from 'zod';

const idParams = z.object({ id: z.string().trim().min(1) });
const spaceNoteParams = z.object({
  spaceId: z.string().trim().min(1),
  id: z.string().trim().min(1).optional(),
});
const spaceIdParams = z.object({ spaceId: z.string().trim().min(1) });
const deckCardParams = z.object({
  id: z.string().trim().min(1),
  cardId: z.string().trim().min(1),
});
const planTopicParams = z.object({
  id: z.string().trim().min(1),
  topicId: z.string().trim().min(1),
});
const shareNoteParams = z.object({ id: z.string().trim().min(1) });
const shareQuizParams = z.object({ id: z.string().trim().min(1) });
const tokenParams = z.object({ token: z.string().trim().min(1) });

const optionSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
});

const questionBase = {
  id: z.string().trim().min(1).optional(),
  prompt: z.string().trim().min(1),
  points: z.number().positive().max(100).optional(),
  explanation: z.string().optional(),
};

const questionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('mcq'),
    ...questionBase,
    options: z.array(optionSchema).min(2),
    correctOptionId: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal('multi_select'),
    ...questionBase,
    options: z.array(optionSchema).min(2),
    correctOptionIds: z.array(z.string().trim().min(1)).min(1),
  }),
  z.object({
    type: z.literal('true_false'),
    ...questionBase,
    correctAnswer: z.boolean(),
  }),
]);

const cardSchema = z.object({
  id: z.string().trim().min(1).optional(),
  front: z.string().trim().min(1),
  back: z.string().trim().min(1),
});

const answerSchema = z.object({
  questionId: z.string().trim().min(1),
  response: z.union([z.string(), z.array(z.string()), z.boolean()]),
});

const topicSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  estimatedMinutes: z.number().int().min(1).max(1440).optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
  })
  .strict();

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(120),
  description: z.string().max(1000).optional(),
  color: z.string().trim().max(32).optional(),
});

export const updateSpaceSchema = createSpaceSchema.partial();

export const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(100_000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
});

export const updateNoteSchema = createNoteSchema.partial();

export const createQuizSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  questions: z.array(questionSchema).min(1).max(100),
  timeLimitMinutes: z.number().int().min(1).max(600).nullable().optional(),
});

export const updateQuizSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  questions: z.array(questionSchema).min(1).max(100).optional(),
  timeLimitMinutes: z.number().int().min(1).max(600).nullable().optional(),
});

export const submitQuizSchema = z.object({
  answers: z.array(answerSchema).max(200),
});

export const createDeckSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  cards: z.array(cardSchema).max(500).optional(),
});

export const updateDeckSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  cards: z.array(cardSchema).max(500).optional(),
});

export const reviewCardSchema = z.object({
  rating: z.enum(['again', 'hard', 'good', 'easy']),
});

export const reviewScheduleSchema = reviewCardSchema;

export const createExamPlanSchema = z.object({
  name: z.string().trim().min(1).max(200),
  examDate: z.coerce.date(),
  dailyStudyHours: z.number().min(0.5).max(24),
  topics: z.array(topicSchema).min(1).max(100),
});

export const updateExamPlanSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  examDate: z.coerce.date().optional(),
  dailyStudyHours: z.number().min(0.5).max(24).optional(),
});

export const markTopicCompleteSchema = z
  .object({
    dayId: z.string().trim().min(1).optional(),
  })
  .optional();

export const createSessionSchema = z.object({
  spaceId: z.string().trim().min(1).nullable().optional(),
  subject: z.string().trim().max(120).optional(),
  durationMinutes: z.number().int().min(1).max(1440),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().nullable().optional(),
});

export const createBookmarkSchema = z.object({
  itemId: z.string().trim().min(1),
  itemType: z.enum(['note', 'quiz', 'flashcarddeck']),
});

const timeStringSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM format');

const availabilityWindowSchema = z.object({
  id: z.string().trim().min(1).optional(),
  start: timeStringSchema,
  end: timeStringSchema,
});

export const dayAvailabilitySchema = z.object({
  mode: z.enum(['budget', 'budget-windows']),
  budgetMinutes: z.number().int().min(0).max(1440),
  available: z.boolean(),
  windows: z.array(availabilityWindowSchema).max(10).default([]),
});

export const saveAvailabilitySchema = z.object({
  days: z.array(dayAvailabilitySchema).length(7),
});

export const weekdayParamSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
});

export const attentionApplySchema = z.object({
  strategy: z.enum(['next-free-slot', 'weekend']),
});

export const assistantCommandSchema = z.object({
  text: z.string().trim().min(1).max(400),
});

export const assistantApplySchema = z.object({
  planId: z.string().trim().min(1),
  strategy: z.enum(['next-free-slot', 'weekend']),
});

export const assistantChatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  mode: z.enum(['answer', 'explain', 'summary', 'detailed']).default('answer'),
  spaceId: z.string().trim().min(1).nullable().optional(),
  noteIds: z.array(z.string().trim().min(1)).max(50).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .max(20)
    .default([]),
});

export const aiAccessGrantSchema = z.object({
  email: z.string().trim().email(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
});

export const idParamSchema = idParams;
export const spaceNoteParamsSchema = spaceNoteParams;
export const spaceIdParamSchema = spaceIdParams;
export const deckCardParamsSchema = deckCardParams;
export const planTopicParamsSchema = planTopicParams;
export const shareNoteParamsSchema = shareNoteParams;
export const shareQuizParamsSchema = shareQuizParams;
export const tokenParamsSchema = tokenParams;
