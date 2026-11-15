import { AppError } from '../../errors';
import {
  AICommandInput,
  AICommandInterpretation,
  AIChatInput,
  AIChatResult,
  AIGeneratedQuestion,
  AINoteInput,
  AIQuizInput,
  AIPerformanceInput,
  AIPerformanceInterpretation,
  AIPerformancePracticeSuggestion,
  IAIProvider,
} from '../../domain/interfaces/IAIProvider';

interface SummaryResponse {
  summary?: string;
}

interface QuizResponse {
  questions?: AIGeneratedQuestion[];
}

interface CommandResponse {
  interpretation?: AICommandInterpretation;
}

interface PerformanceResponse {
  interpretation?: AIPerformanceInterpretation;
}

/**
 * HTTP adapter for an optional external AI service.
 *
 * OOP: Adapter - translates the provider-neutral IAIProvider contract to a
 * remote JSON API.
 */
export class ExternalAIProvider implements IAIProvider {
  public readonly name = 'external';

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  public async summarizeNote(input: AINoteInput): Promise<string> {
    const response = await this.post<SummaryResponse>('/summarize', input);
    if (!response.summary || response.summary.trim().length === 0) {
      throw new AppError('External AI provider returned an empty summary', 502, false);
    }
    return response.summary;
  }

  public async generateQuiz(input: AIQuizInput): Promise<AIGeneratedQuestion[]> {
    const response = await this.post<QuizResponse>('/generate-quiz', input);
    if (!Array.isArray(response.questions)) {
      throw new AppError(
        'External AI provider returned an invalid quiz payload',
        502,
        false,
      );
    }
    return response.questions;
  }

  public async chat(input: AIChatInput): Promise<AIChatResult> {
    const response = await this.post<Partial<AIChatResult>>('/chat', input);
    if (
      typeof response.answer !== 'string' ||
      response.answer.trim().length === 0 ||
      !Array.isArray(response.citedNoteIds) ||
      typeof response.usedExternalKnowledge !== 'boolean'
    ) {
      throw new AppError('External AI provider returned an invalid chat response', 502, false);
    }
    return {
      answer: response.answer,
      citedNoteIds: response.citedNoteIds.filter(
        (id): id is string => typeof id === 'string',
      ),
      citedChunkIds: Array.isArray(response.citedChunkIds)
        ? response.citedChunkIds.filter((id): id is string => typeof id === 'string')
        : [],
      usedExternalKnowledge: response.usedExternalKnowledge,
    };
  }


  public async interpretPerformance(
    input: AIPerformanceInput,
  ): Promise<AIPerformanceInterpretation> {
    const response = await this.post<PerformanceResponse>(
      '/interpret-performance',
      input,
    );
    const interpretation = response.interpretation;
    if (
      !interpretation ||
      typeof interpretation.summary !== 'string' ||
      interpretation.summary.trim().length === 0 ||
      typeof interpretation.trendInterpretation !== 'string'
    ) {
      throw new AppError(
        'External AI provider returned an invalid performance interpretation',
        502,
        false,
      );
    }

    const strings = (value: unknown): string[] =>
      Array.isArray(value)
        ? value
            .filter((item): item is string => typeof item === 'string')
            .slice(0, 3)
        : [];
    const suggestions = Array.isArray(interpretation.practiceSuggestions)
      ? interpretation.practiceSuggestions
          .filter(
            (item): item is AIPerformancePracticeSuggestion =>
              Boolean(item) &&
              typeof item.title === 'string' &&
              item.title.trim().length > 0 &&
              typeof item.reason === 'string' &&
              item.reason.trim().length > 0 &&
              (item.topicId === null || typeof item.topicId === 'string'),
          )
          .slice(0, 3)
      : [];

    return {
      summary: interpretation.summary.trim(),
      strengths: strings(interpretation.strengths),
      improvementAreas: strings(interpretation.improvementAreas),
      trendInterpretation: interpretation.trendInterpretation.trim(),
      focusTopicIds: strings(interpretation.focusTopicIds),
      practiceSuggestions: suggestions,
    };
  }

  public async interpretCommand(
    input: AICommandInput,
  ): Promise<AICommandInterpretation> {
    const response = await this.post<CommandResponse>('/interpret-command', input);
    const interpretation = response.interpretation;
    if (
      !interpretation ||
      typeof interpretation.understood !== 'boolean' ||
      !interpretation.response
    ) {
      throw new AppError(
        'External AI provider returned an invalid command interpretation',
        502,
        false,
      );
    }
    return interpretation;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new AppError(
        `External AI provider request failed with status ${response.status}`,
        502,
        false,
      );
    }

    return (await response.json()) as T;
  }
}
