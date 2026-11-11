import { ValidationError } from '../../errors';
import { uniqueIds } from '../base/helpers';
import {
  Question,
  QuestionEvaluation,
  QuestionOption,
  QuestionProps,
  QuestionResponse,
} from './Question';

export interface MultiSelectQuestionProps extends QuestionProps {
  options: QuestionOption[];
  correctOptionIds: string[];
}

/**
 * Multiple-answer question.
 *
 * OOP: Inheritance - extends Question.
 * OOP: Polymorphism - evaluate() compares a set of selected option ids.
 */
export class MultiSelectQuestion extends Question {
  public override readonly type = 'multi_select' as const;

  private readonly _options: QuestionOption[];
  private readonly _correctOptionIds: string[];

  constructor(props: MultiSelectQuestionProps) {
    super(props);
    this._options = Question.validateOptions(props.options);
    this._correctOptionIds = uniqueIds(props.correctOptionIds ?? []);

    if (this._correctOptionIds.length === 0) {
      throw new ValidationError('correctOptionIds must contain at least one option');
    }

    const optionIds = new Set(this._options.map((option) => option.id));
    for (const id of this._correctOptionIds) {
      if (!optionIds.has(id)) {
        throw new ValidationError(`correctOptionIds references an unknown option: ${id}`);
      }
    }
  }

  public getOptions(): QuestionOption[] {
    return this._options.map((option) => ({ ...option }));
  }

  public getCorrectOptionIds(): string[] {
    return [...this._correctOptionIds];
  }

  public evaluate(response: QuestionResponse): QuestionEvaluation {
    const selected = Array.isArray(response)
      ? uniqueIds(response.filter((value): value is string => typeof value === 'string'))
      : typeof response === 'string'
        ? uniqueIds([response])
        : [];

    const correct =
      selected.length === this._correctOptionIds.length &&
      this._correctOptionIds.every((id) => selected.includes(id));

    return this.buildEvaluation(correct, [...this._correctOptionIds]);
  }

  public getCorrectAnswer(): string[] {
    return [...this._correctOptionIds];
  }
}
