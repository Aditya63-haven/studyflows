import {
  AICommandInput,
  AICommandInterpretation,
  AICommandPlanSummary,
  AIChatInput,
  AIChatResult,
  AIGeneratedQuestion,
  AINoteInput,
  AIQuizInput,
  IAIProvider,
} from '../../domain/interfaces/IAIProvider';
import { RescheduleStrategyName } from '../../domain/interfaces/IRescheduleStrategy';
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

  /**
   * Deterministic keyword rules: recognizes "move unfinished <subject> work
   * to the weekend / next free slot" style commands.
   */
  /**
   * Deterministic note-grounded answers used by tests and local development.
   */
  public async chat(input: AIChatInput): Promise<AIChatResult> {
    const keywords = MockAIProvider.extractKeywords(input.message, 12);
    const ranked = input.notes
      .map((note) => ({
        note,
        score: MockAIProvider.scoreNote(note.title, note.content, keywords),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    if (ranked.length === 0) {
      return {
        answer:
          "I couldn't find a matching note in the selected study context. Select or add a relevant note for a grounded answer, or ask a broader question about the material you have included.",
        citedNoteIds: [],
        usedExternalKnowledge: false,
      };
    }

    const citations = ranked.map(({ note }) => note.id);
    const snippets = ranked.map(({ note }) => {
      const sentences = MockAIProvider.extractSentences(note.content);
      const relevant = sentences.find((sentence) =>
        keywords.some((keyword) => sentence.toLowerCase().includes(keyword)),
      );
      const fallback = sentences.slice(0, 2).join(' ') || note.content;
      return {
        title: note.title,
        text: MockAIProvider.truncate(relevant ?? fallback, 320),
      };
    });

    const opening =
      input.mode === 'summary'
        ? `Here is a concise summary from ${input.spaceName}:`
        : input.mode === 'explain'
          ? 'Here is an explanation grounded in your selected notes:'
          : input.mode === 'detailed'
            ? 'Here is a detailed answer drawn from your selected notes:'
            : 'Based on your selected notes:';

    const body = snippets
      .map((snippet) => `- **${snippet.title}**: ${snippet.text}`)
      .join('\n');

    return {
      answer: `${opening}\n\n${body}`,
      citedNoteIds: citations,
      usedExternalKnowledge: false,
    };
  }

  public async interpretCommand(
    input: AICommandInput,
  ): Promise<AICommandInterpretation> {
    const text = input.text.toLowerCase();
    const wantsMove = /(move|shift|reschedul|push|send|put|rearrange)/.test(text);
    const mentionsWeekend = /(weekend|saturday|sunday)/.test(text);
    const mentionsNextSlot =
      /(next|free|slot|earliest|tomorrow|soonest|later|asap|available)/.test(text);

    if (!wantsMove || (!mentionsWeekend && !mentionsNextSlot)) {
      return {
        understood: false,
        action: 'none',
        strategy: null,
        planId: null,
        response:
          "I can move unfinished work to the weekend or to your next free slot. Try: \"Move unfinished Maths work to the weekend\".",
      };
    }

    const strategy: RescheduleStrategyName = mentionsWeekend ? 'weekend' : 'next-free-slot';
    const plan = MockAIProvider.matchPlan(input.text, input.plans);

    if (!plan) {
      const planNames = input.plans.map((candidate) => `"${candidate.name}"`).join(', ');
      const subject = MockAIProvider.matchSubject(input.text, input.subjects);
      if (subject) {
        return {
          understood: false,
          action: 'none',
          strategy: null,
          planId: null,
          response: `I found no exam plan matching "${subject}". Which plan should I adjust? You have: ${planNames}.`,
        };
      }
      return {
        understood: false,
        action: 'none',
        strategy: null,
        planId: null,
        response:
          input.plans.length === 0
            ? 'You do not have any exam plans to adjust yet.'
            : `Which plan should I adjust? You have: ${planNames}.`,
      };
    }

    return {
      understood: true,
      action: 'move-work',
      strategy,
      planId: plan.id,
      response: `Move the unfinished work (${plan.incompleteTopics} topic${
        plan.incompleteTopics === 1 ? '' : 's'
      }) from "${plan.name}" to ${
        strategy === 'weekend' ? 'the weekend' : 'your next free slot'
      }.`,
    };
  }

  private static matchPlan(
    text: string,
    plans: AICommandPlanSummary[],
  ): AICommandPlanSummary | null {
    if (plans.length === 0) {
      return null;
    }

    const words = MockAIProvider.extractKeywords(text);
    let best: { plan: AICommandPlanSummary; score: number } | null = null;

    for (const plan of plans) {
      const planTokens = MockAIProvider.extractKeywords(
        [plan.name, ...plan.keywords].join(' '),
        Number.MAX_SAFE_INTEGER,
      );
      let score = 0;
      for (const word of words) {
        const stem = word.slice(0, 4);
        for (const token of planTokens) {
          if (word === token || token.startsWith(stem) || word.startsWith(token.slice(0, 4))) {
            score += 1;
            break;
          }
        }
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { plan, score };
      }
    }

    if (best) {
      return best.plan;
    }
    if (plans.length === 1) {
      return plans[0];
    }
    return null;
  }

  private static matchSubject(text: string, subjects: string[]): string | null {
    if (subjects.length === 0) {
      return null;
    }

    const words = MockAIProvider.extractKeywords(text);
    let best: { subject: string; score: number } | null = null;

    for (const subject of subjects) {
      const subjectTokens = MockAIProvider.extractKeywords(
        subject,
        Number.MAX_SAFE_INTEGER,
      );
      let score = 0;
      for (const word of words) {
        const stem = word.slice(0, 4);
        for (const token of subjectTokens) {
          if (word === token || token.startsWith(stem) || word.startsWith(token.slice(0, 4))) {
            score += 1;
            break;
          }
        }
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { subject, score };
      }
    }

    return best ? best.subject : null;
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

  private static scoreNote(title: string, content: string, keywords: string[]): number {
    if (keywords.length === 0) {
      return 0;
    }
    const normalizedTitle = title.toLowerCase();
    const normalizedContent = content.toLowerCase();
    return keywords.reduce((score, keyword) => {
      const titleMatch = normalizedTitle.includes(keyword) ? 4 : 0;
      const contentMatches = normalizedContent.split(keyword).length - 1;
      return score + titleMatch + Math.min(contentMatches, 3);
    }, 0);
  }

  private static extractSentences(content: string): string[] {
    return content
      .split(/(?<=[.!?])\s+|\n+/)
      .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
      .filter((sentence) => sentence.length > 0);
  }

  private static extractKeywords(text: string, limit = 8): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));

    return [...new Set(words)].slice(0, limit);
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
