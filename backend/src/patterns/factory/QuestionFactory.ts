import { ValidationError } from '../../errors';
import { MCQQuestion, MCQQuestionProps } from '../../domain/questions/MCQQuestion';
import {
  MultiSelectQuestion,
  MultiSelectQuestionProps,
} from '../../domain/questions/MultiSelectQuestion';
import { Question, QuestionType } from '../../domain/questions/Question';
import {
  TrueFalseQuestion,
  TrueFalseQuestionProps,
} from '../../domain/questions/TrueFalseQuestion';

export type QuestionFactoryInput =
  | ({ type: 'mcq' } & MCQQuestionProps)
  | ({ type: 'multi_select' } & MultiSelectQuestionProps)
  | ({ type: 'true_false' } & TrueFalseQuestionProps);

export type QuestionCreator = (input: QuestionFactoryInput) => Question;

/**
 * Creates the correct Question subclass from a discriminated data object.
 *
 * OOP: Factory - centralizes question construction.
 * OOP: OCP - new question types can be added by registering a creator instead of
 * changing calling code.
 */
export class QuestionFactory {
  private static readonly creators = new Map<QuestionType, QuestionCreator>([
    [
      'mcq',
      (input) => {
        if (input.type !== 'mcq') {
          throw new ValidationError('Invalid data for mcq question');
        }
        return new MCQQuestion(input);
      },
    ],
    [
      'multi_select',
      (input) => {
        if (input.type !== 'multi_select') {
          throw new ValidationError('Invalid data for multi_select question');
        }
        return new MultiSelectQuestion(input);
      },
    ],
    [
      'true_false',
      (input) => {
        if (input.type !== 'true_false') {
          throw new ValidationError('Invalid data for true_false question');
        }
        return new TrueFalseQuestion(input);
      },
    ],
  ]);

  public static create(input: QuestionFactoryInput): Question {
    const creator = QuestionFactory.creators.get(input.type);
    if (!creator) {
      throw new ValidationError(`Unsupported question type: ${input.type}`);
    }
    return creator(input);
  }

  public static register(type: QuestionType, creator: QuestionCreator): void {
    QuestionFactory.creators.set(type, creator);
  }
}
