import apiClient from './client';
import { Note, NoteInput, Quiz } from './types';

export const notesApi = {
  async listBySpace(spaceId: string): Promise<Note[]> {
    const { data } = await apiClient.get<{ notes: Note[] }>(
      `/spaces/${spaceId}/notes`,
    );
    return data.notes;
  },

  async get(id: string): Promise<Note> {
    const { data } = await apiClient.get<{ note: Note }>(`/notes/${id}`);
    return data.note;
  },

  async create(spaceId: string, input: NoteInput): Promise<Note> {
    const { data } = await apiClient.post<{ note: Note }>(
      `/spaces/${spaceId}/notes`,
      input,
    );
    return data.note;
  },

  async update(id: string, input: Partial<NoteInput>): Promise<Note> {
    const { data } = await apiClient.patch<{ note: Note }>(`/notes/${id}`, input);
    return data.note;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/notes/${id}`);
  },

  async condense(id: string): Promise<Note> {
    const { data } = await apiClient.post<{ note: Note }>(`/notes/${id}/condense`);
    return data.note;
  },

  async generateQuiz(id: string): Promise<Quiz> {
    const { data } = await apiClient.post<{ quiz: Quiz }>(
      `/notes/${id}/generate-quiz`,
    );
    return data.quiz;
  },
};
