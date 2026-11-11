import apiClient from './client';
import { SearchResult } from './types';

export const searchApi = {
  async search(query: string): Promise<SearchResult[]> {
    const { data } = await apiClient.get<{ results: SearchResult[] }>('/search', {
      params: { q: query },
    });
    return data.results;
  },
};
