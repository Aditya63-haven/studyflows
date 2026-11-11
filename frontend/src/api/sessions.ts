import apiClient from './client';
import { SessionInput, StudySession } from './types';

export const sessionsApi = {
  async list(): Promise<StudySession[]> {
    const { data } = await apiClient.get<{ sessions: StudySession[] }>('/sessions');
    return data.sessions;
  },

  async create(input: SessionInput): Promise<StudySession> {
    const { data } = await apiClient.post<{ session: StudySession }>(
      '/sessions',
      input,
    );
    return data.session;
  },
};
