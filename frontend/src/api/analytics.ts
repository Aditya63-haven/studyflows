import apiClient from './client';
import { AnalyticsOverview } from './types';

export const analyticsApi = {
  async overview(): Promise<AnalyticsOverview> {
    const { data } = await apiClient.get<{ analytics: AnalyticsOverview }>(
      '/analytics',
    );
    return data.analytics;
  },
};
