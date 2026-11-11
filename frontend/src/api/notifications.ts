import apiClient from './client';
import { AppNotification } from './types';

export interface NotificationListResult {
  notifications: AppNotification[];
  unreadCount: number;
}

export const notificationsApi = {
  async list(): Promise<NotificationListResult> {
    const { data } = await apiClient.get<{
      notifications: AppNotification[];
      unreadCount: number;
    }>('/notifications');
    return { notifications: data.notifications, unreadCount: data.unreadCount };
  },

  async markRead(id: string): Promise<AppNotification> {
    const { data } = await apiClient.patch<{ notification: AppNotification }>(
      `/notifications/${id}/read`,
    );
    return data.notification;
  },
};
