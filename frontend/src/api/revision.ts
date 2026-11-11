import apiClient from './client';
import { ReviewRating, RevisionDashboard, RevisionSchedule } from './types';

export const revisionApi = {
  async list(): Promise<RevisionSchedule[]> {
    const { data } = await apiClient.get<{ schedules: RevisionSchedule[] }>(
      '/revision',
    );
    return data.schedules;
  },

  async dashboard(): Promise<RevisionDashboard> {
    const { data } = await apiClient.get<RevisionDashboard>('/revision/dashboard');
    return data;
  },

  async review(id: string, rating: ReviewRating): Promise<RevisionSchedule> {
    const { data } = await apiClient.post<{ schedule: RevisionSchedule }>(
      `/revision/${id}/review`,
      { rating },
    );
    return data.schedule;
  },
};
