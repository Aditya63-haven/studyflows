import apiClient from './client';
import {
  AnalyticsOverview,
  PerformanceFilters,
  PerformanceReport,
} from './types';

export const analyticsApi = {
  async overview(): Promise<AnalyticsOverview> {
    const { data } = await apiClient.get<{ analytics: AnalyticsOverview }>(
      '/analytics',
    );
    return data.analytics;
  },

  async performance(filters: PerformanceFilters = {}): Promise<PerformanceReport> {
    const { data } = await apiClient.get<{ report: PerformanceReport }>(
      '/analytics/performance',
      { params: filters },
    );
    return data.report;
  },

  async acceptRecommendation(
    id: string,
    filters: PerformanceFilters = {},
  ): Promise<{ created: boolean }> {
    const { data } = await apiClient.post<{ created: boolean }>(
      `/analytics/performance/recommendations/${encodeURIComponent(id)}/accept`,
      undefined,
      { params: filters },
    );
    return data;
  },
};
