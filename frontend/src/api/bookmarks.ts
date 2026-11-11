import apiClient from './client';
import { BookmarkView, StudyItemType } from './types';

export const bookmarksApi = {
  async list(): Promise<BookmarkView[]> {
    const { data } = await apiClient.get<{ bookmarks: BookmarkView[] }>(
      '/bookmarks',
    );
    return data.bookmarks;
  },

  async create(itemId: string, itemType: StudyItemType): Promise<BookmarkView> {
    const { data } = await apiClient.post<{ bookmark: BookmarkView }>(
      '/bookmarks',
      { itemId, itemType },
    );
    return data.bookmark;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/bookmarks/${id}`);
  },
};
