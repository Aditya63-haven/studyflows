import { ValidationError } from '../src/errors';
import { MCQQuestion } from '../src/domain/questions/MCQQuestion';
import { MultiSelectQuestion } from '../src/domain/questions/MultiSelectQuestion';
import { TrueFalseQuestion } from '../src/domain/questions/TrueFalseQuestion';
import { QuestionFactory } from '../src/patterns/factory/QuestionFactory';

const options = [
  { id: 'a', text: 'Option A' },
  { id: 'b', text: 'Option B' },
];

describe('QuestionFactory.create', () => {
  it('creates each supported question subtype', () => {
    const mcq = QuestionFactory.create({
      type: 'mcq',
      prompt: 'Pick one',
      options,
      correctOptionId: 'a',
    });
    const multi = QuestionFactory.create({
      type: 'multi_select',
      prompt: 'Pick many',
      options,
      correctOptionIds: ['a', 'b'],
    });
    const trueFalse = QuestionFactory.create({
      type: 'true_false',
      prompt: 'Pick true or false',
      correctAnswer: true,
    });

    expect(mcq).toBeInstanceOf(MCQQuestion);
    expect(multi).toBeInstanceOf(MultiSelectQuestion);
    expect(trueFalse).toBeInstanceOf(TrueFalseQuestion);
  });

  it('rejects unsupported question types', () => {
    expect(() => QuestionFactory.create({ type: 'essay', prompt: 'Explain' } as never)).toThrow(
      ValidationError,
    );
  });

  it('rejects invalid subtype data', () => {
    expect(() =>
      QuestionFactory.create({
        type: 'mcq',
        prompt: 'Pick one',
        options,
        correctOptionId: 'missing',
      }),
    ).toThrow('correctOptionId must reference one of the options');

    expect(() =>
      QuestionFactory.create({
        type: 'multi_select',
        prompt: 'Pick many',
        options,
        correctOptionIds: [],
      }),
    ).toThrow('correctOptionIds must contain at least one option');
  });
});
