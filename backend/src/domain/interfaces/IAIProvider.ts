import { QuestionOption, QuestionType } from '../questions/Question';
import { RescheduleStrategyName } from './IRescheduleStrategy';

export interface AINoteInput {
  title: string;
  content: string;
}

export interface AIQuizInput extends AINoteInput {
  questionCount?: number;
}

/**
 * Provider-neutral question data produced by an AI provider.
 */
export interface AIGeneratedQuestion {
  type: QuestionType;
  prompt: string;
  points?: number;
  explanation?: string;
  options?: QuestionOption[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  correctAnswer?: boolean;
}

/**
 * Plan summary passed to the provider when interpreting an assistant command.
 * `keywords` carries the plan name and its topic names so providers can match
 * subject-style phrasing against what the plan actually covers.
 */
export interface AICommandPlanSummary {
  id: string;
  name: string;
  examDate: Date;
  incompleteTopics: number;
  missedMinutes: number;
  keywords: string[];
}

/**
 * Context for interpreting an assistant command. `subjects` lists the names
 * and subjects of the user's study spaces so providers can detect subject
 * mentions even when the plan name does not contain them.
 */
export interface AICommandInput {
  text: string;
  plans: AICommandPlanSummary[];
  subjects: string[];
}

export type AICommandAction = 'move-work' | 'none';

/**
 * Structured understanding of a natural-language study command.
 */
export interface AICommandInterpretation {
  understood: boolean;
  action: AICommandAction;
  strategy: RescheduleStrategyName | null;
  planId: string | null;
  response: string;
}

/**
 * Abstraction for AI-backed study features.
 *
 * OOP: Abstraction - note condensation, quiz generation and command parsing
 * depend only on this interface.
 * OOP: Adapter - concrete providers adapt external or mock backends to this
 * contract.
 */
export interface IAIProvider {
  readonly name: string;
  summarizeNote(input: AINoteInput): Promise<string>;
  generateQuiz(input: AIQuizInput): Promise<AIGeneratedQuestion[]>;
  interpretCommand(input: AICommandInput): Promise<AICommandInterpretation>;
}
