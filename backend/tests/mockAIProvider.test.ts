import { AIExamPreparationInput } from '../src/domain/interfaces/IAIProvider';
import { MockAIProvider } from '../src/patterns/adapter/MockAIProvider';

const input: AIExamPreparationInput = {
  examName: 'Biology Final',
  examDate: '2026-04-10T09:00:00.000Z',
  daysRemaining: 20,
  subject: 'Biology',
  spaceName: 'Biology',
  dailyStudyHours: 2,
  availability: { weeklyMinutes: 840, source: 'default' },
  dataQuality: {
    reliable: false,
    insufficientData: ['Only two questions were answered.'],
    limitations: [],
  },
  topics: [
    {
      topicId: 'topic-2',
      topicName: 'Genetics',
      estimatedMinutes: 45,
      completed: false,
      performance: null,
      revision: null,
    },
    {
      topicId: 'topic-1',
      topicName: 'Cell Biology',
      estimatedMinutes: 60,
      completed: false,
      performance: {
        accuracy: 40,
        answeredQuestions: 5,
        classification: 'weak',
        evidence: ['2/5 questions correct.'],
        trendDirection: 'declining',
      },
      revision: null,
    },
    {
      topicId: 'topic-3',
      topicName: 'Ecology',
      estimatedMinutes: 30,
      completed: true,
      performance: null,
      revision: null,
    },
  ],
  sourceChunks: [
    {
      chunkId: 'chunk-1',
      documentTitle: 'syllabus.txt',
      pageNumber: 1,
      section: 'Cell Biology',
      text: 'Cell Biology covers membranes and organelles.',
    },
  ],
};

describe('MockAIProvider exam preparation', () => {
  it('is deterministic and prioritises measured weak topics', async () => {
    const provider = new MockAIProvider();

    const result = await provider.planExamPreparation(input);

    expect(result.sequence.map((item) => item.topicId)).toEqual([
      'topic-1',
      'topic-2',
    ]);
    expect(result.sequence[0].reason).toBe('2/5 questions correct.');
    expect(result.usedChunkIds).toEqual(['chunk-1']);
    expect(result.cautions.join(' ')).toContain('Saved availability');
    expect(result.cautions.join(' ')).toContain('limited');
    expect(result.summary).toContain('Biology Final');
    expect(result.summary).toContain('Cell Biology');
  });

  it('returns a clear no-work message when every topic is complete', async () => {
    const provider = new MockAIProvider();

    const result = await provider.planExamPreparation({
      ...input,
      topics: input.topics.map((topic) => ({ ...topic, completed: true })),
    });

    expect(result.sequence).toEqual([]);
    expect(result.summary).toContain('already complete');
    expect(result.cautions).toHaveLength(1);
  });
});
