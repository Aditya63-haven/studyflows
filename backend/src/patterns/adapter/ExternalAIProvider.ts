import { AppError } from '../../errors';
import {
  AIGeneratedQuestion,
  AINoteInput,
  AIQuizInput,
  IAIProvider,
} from '../../domain/interfaces/IAIProvider';

interface SummaryResponse {
  summary?: string;
}

interface QuizResponse {
  questions?: AIGeneratedQuestion[];
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
