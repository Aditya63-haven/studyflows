import { MCQQuestion } from '../../domain/questions/MCQQuestion';
import { MultiSelectQuestion } from '../../domain/questions/MultiSelectQuestion';
import { Question } from '../../domain/questions/Question';
import { TrueFalseQuestion } from '../../domain/questions/TrueFalseQuestion';
import { Quiz } from '../../domain/entities/Quiz';
import { QuestionRecord, QuizDocument } from '../schemas/quiz.schema';

const questionToDomain = (record: QuestionRecord): Question => {
  const base = {
    id: record._id,
    prompt: record.prompt,
    points: record.points,
    explanation: record.explanation,
  };

  switch (record.type) {
    case 'mcq':
      return new MCQQuestion({
        ...base,
        options: (record.options ?? []).map((option) => ({
          id: option.id,
          text: option.text,
        })),
        correctOptionId: record.correctOptionId ?? '',
      });
    case 'multi_select':
      return new MultiSelectQuestion({
        ...base,
        options: (record.options ?? []).map((option) => ({
          id: option.id,
          text: option.text,
        })),
        correctOptionIds: record.correctOptionIds ?? [],
      });
    case 'true_false':
      return new TrueFalseQuestion({
        ...base,
        correctAnswer: record.correctAnswer ?? false,
      });
    default:
      throw new Error(`Unsupported persisted question type: ${String(record.type)}`);
  }
};

const questionToPersistence = (question: Question): QuestionRecord => {
  const base: QuestionRecord = {
    _id: question.getId(),
    type: question.type,
    prompt: question.getPrompt(),
    points: question.getPoints(),
    explanation: question.getExplanation(),
  };

  if (question instanceof MCQQuestion) {
    return {
      ...base,
      options: question.getOptions(),
      correctOptionId: question.getCorrectOptionId(),
    };
  }

  if (question instanceof MultiSelectQuestion) {
    return {
      ...base,
      options: question.getOptions(),
      correctOptionIds: question.getCorrectOptionIds(),
    };
  }

  if (question instanceof TrueFalseQuestion) {
    return {
      ...base,
      correctAnswer: question.getCorrectAnswerValue(),
    };
  }

  throw new Error(`Unsupported question subtype: ${question.type}`);
};

export class QuizMapper {
  public static toDomain(document: QuizDocument): Quiz {
    return new Quiz({
      id: document._id,
      ownerId: document.owner,
      spaceId: document.space,
      title: document.title,
      description: document.description,
      questions: document.questions.map(questionToDomain),
      timeLimitMinutes: document.timeLimitMinutes,
      shareToken: document.shareToken,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  public static toPersistence(quiz: Quiz): QuizDocument {
    return {
      _id: quiz.getId(),
      owner: quiz.getOwnerId(),
      space: quiz.getSpaceId(),
      title: quiz.getTitle(),
      description: quiz.getDescription(),
      questions: quiz.getQuestions().map(questionToPersistence),
      timeLimitMinutes: quiz.getTimeLimitMinutes(),
      shareToken: quiz.getShareToken(),
      createdAt: quiz.getCreatedAt(),
      updatedAt: quiz.getUpdatedAt(),
    };
  }
}
