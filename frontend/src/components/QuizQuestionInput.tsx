import type { Question, QuestionResponse } from '../api/types';

interface QuizQuestionInputProps {
  question: Question;
  response: QuestionResponse | undefined;
  onChange: (response: QuestionResponse) => void;
  onToggleMulti: (optionId: string) => void;
}

export const QuizQuestionInput = ({
  question,
  response,
  onChange,
  onToggleMulti,
}: QuizQuestionInputProps) => {
  if (question.type === 'true_false') {
    return (
      <div className="answer-options">
        {[true, false].map((value) => (
          <label key={String(value)} className="answer-option">
            <input
              type="radio"
              checked={response === value}
              onChange={() => onChange(value)}
            />
            <span>{value ? 'True' : 'False'}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="answer-options">
      {(question.options ?? []).map((option) => {
        const checked =
          question.type === 'mcq'
            ? response === option.id
            : Array.isArray(response) && response.includes(option.id);
        return (
          <label key={option.id} className="answer-option">
            <input
              type={question.type === 'mcq' ? 'radio' : 'checkbox'}
              checked={checked}
              onChange={() =>
                question.type === 'mcq' ? onChange(option.id) : onToggleMulti(option.id)
              }
            />
            <span>{option.text}</span>
          </label>
        );
      })}
    </div>
  );
};
