import apiClient from './client';
import { Note, Quiz, QuizAnswer, QuizGradeResult, SharedLink } from './types';

export const sharingApi = {
  async shareNote(noteId: string): Promise<SharedLink> {
    const { data } = await apiClient.post<{ share: SharedLink }>(
      `/share/notes/${noteId}`,
    );
    return data.share;
  },

  async shareQuiz(quizId: string): Promise<SharedLink> {
    const { data } = await apiClient.post<{ share: SharedLink }>(
      `/share/quizzes/${quizId}`,
    );
    return data.share;
  },

  async revoke(token: string): Promise<void> {
    await apiClient.delete(`/share/${token}`);
  },

  async getPublicNote(token: string): Promise<Note> {
    const { data } = await apiClient.get<{ note: Note }>(`/public/notes/${token}`);
    return data.note;
  },

  async getPublicQuiz(token: string): Promise<Quiz> {
    const { data } = await apiClient.get<{ quiz: Quiz }>(
      `/public/quizzes/${token}`,
    );
    return data.quiz;
  },

  async submitPublicQuiz(
    token: string,
    answers: QuizAnswer[],
  ): Promise<QuizGradeResult> {
    const { data } = await apiClient.post<{ result: QuizGradeResult }>(
      `/public/quizzes/${token}/attempts`,
      { answers },
    );
    return data.result;
  },
};
