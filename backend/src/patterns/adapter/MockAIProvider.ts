import {
  AIGeneratedQuestion,
  AINoteInput,
  AIQuizInput,
  IAIProvider,
} from '../../domain/interfaces/IAIProvider';
import { QuestionOption } from '../../domain/questions/Question';

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'because',
  'before',
  'being',
  'between',
  'could',
  'does',
  'during',
  'from',
  'have',
  'into',
  'more',
  'most',
  'other',
  'should',
  'some',
  'such',
  'than',
  'that',
  'their',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'under',
  'very',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'would',
  'your',
]);

/**
 * Deterministic AI provider used for local development and grading.
 *
 * OOP: Adapter - adapts a simple mock implementation to the IAIProvider contract.
 * OOP: Polymorphism - can be swapped with another IAIProvider at runtime.
 */
export class MockAIProvider implements IAIProvider {
  public readonly name = 'mock';

  public async summarizeNote(input: AINoteInput): Promise<string> {
    const sentences = MockAIProvider.extractSentences(input.content);
    const summary =
      sentences.length > 0
        ? sentences.slice(0, 3).join(' ')
        : `A concise overview of ${input.title}. Add notes to generate a richer summary.`;
    return MockAIProvider.truncate(summary, 400);
  }

  public async generateQuiz(input: AIQuizInput): Promise<AIGeneratedQuestion[]> {
    const requested = Number.isFinite(input.questionCount ?? 3)
      ? Math.floor(input.questionCount ?? 3)
      : 3;
    const questionCount = Math.min(10, Math.max(1, requested));
    return this.buildQuestions(input).slice(0, questionCount);
  }

  private buildQuestions(input: AIQuizInput): AIGeneratedQuestion[] {
    const title = input.title.trim() || 'this note';
    const sentences = MockAIProvider.extractSentences(input.content);
    const keywords = MockAIProvider.extractKeywords(`${input.title} ${input.content}`);

    const mcqOptions: QuestionOption[] = [
      { id: 'a', text: title },
      { id: 'b', text: 'An unrelated historical event' },
      { id: 'c', text: 'A random list of dates' },
      { id: 'd', text: 'None of the above' },
    ];

    const keywordPool =
      keywords.length >= 2
        ? keywords.slice(0, 4)
        : ['review', 'practice', ...keywords.slice(0, 1)];
    while (keywordPool.length < 4) {
      keywordPool.push(`concept ${keywordPool.length + 1}`);
    }

    const multiOptions: QuestionOption[] = keywordPool.map((text, index) => ({
      id: `k${index + 1}`,
      text: MockAIProvider.capitalize(text),
    }));
    const correctOptionIds = multiOptions.slice(0, 2).map((option) => option.id);

    const questions: AIGeneratedQuestion[] = [
      {
        type: 'mcq',
        prompt: `What is the main topic of "${title}"?`,
        options: mcqOptions,
        correctOptionId: 'a',
        explanation: `The note is titled "${title}".`,
      },
      {
        type: 'true_false',
        prompt: `The note "${title}" contains material worth revising.`,
        correctAnswer: true,
        explanation: 'The note exists to support revision of this subject.',
      },
      {
        type: 'multi_select',
        prompt: `Which concepts appear in "${title}"?`,
        options: multiOptions,
        correctOptionIds,
        explanation: 'These terms were extracted from the note content.',
      },
    ];

    const extraSentences = sentences
      .filter((sentence) => sentence.length > 20)
      .slice(0, 7);

    for (const [index, sentence] of extraSentences.entries()) {
      questions.push({
        type: 'mcq',
        prompt: `Which statement appears in "${title}"? (${index + 1})`,
        options: [
          { id: 'a', text: MockAIProvider.truncate(sentence, 140) },
          { id: 'b', text: 'A statement not present in the note' },
          { id: 'c', text: 'A definition from a different subject' },
          { id: 'd', text: 'None of the above' },
        ],
        correctOptionId: 'a',
        explanation: 'This sentence is taken directly from the note.',
      });
    }

    return questions;
  }

  private static extractSentences(content: string): string[] {
    return content
      .split(/(?<=[.!?])\s+|\n+/)
      .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
      .filter((sentence) => sentence.length > 0);
  }

  private static extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));

    return [...new Set(words)].slice(0, 8);
  }

  private static capitalize(value: string): string {
    if (!value) {
      return value;
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private static truncate(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
  }
}
