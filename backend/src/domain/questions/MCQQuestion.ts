import { ValidationError } from '../../errors';
import { requireNonEmpty } from '../base/helpers';
import {
  Question,
  QuestionEvaluation,
  QuestionOption,
  QuestionProps,
  QuestionResponse,
} from './Question';

export interface MCQQuestionProps extends QuestionProps {
  options: QuestionOption[];
  correctOptionId: string;
}

/**
 * Single-answer multiple-choice question.
 *
 * OOP: Inheritance - extends Question.
 * OOP: Polymorphism - evaluate() checks the selected option id.
 */
export class MCQQuestion extends Question {
  public override readonly type = 'mcq' as const;

  private readonly _options: QuestionOption[];
  private readonly _correctOptionId: string;

  constructor(props: MCQQuestionProps) {
    super(props);
    this._options = Question.validateOptions(props.options);
    this._correctOptionId = requireNonEmpty(props.correctOptionId, 'correctOptionId');

    if (!this._options.some((option) => option.id === this._correctOptionId)) {
      throw new ValidationError('correctOptionId must reference one of the options');
    }
  }

  public getOptions(): QuestionOption[] {
    return this._options.map((option) => ({ ...option }));
  }

  public getCorrectOptionId(): string {
    return this._correctOptionId;
  }

  public evaluate(response: QuestionResponse): QuestionEvaluation {
    const selected = typeof response === 'string' ? response : null;
    return this.buildEvaluation(selected === this._correctOptionId, [this._correctOptionId]);
  }

  public getCorrectAnswer(): string[] {
    return [this._correctOptionId];
  }
}
