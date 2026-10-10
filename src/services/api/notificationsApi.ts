import { apiClient } from './httpClient'
import type { AppNotificationSummary, NotificationFeed } from './types'

export async function fetchMyNotifications(): Promise<NotificationFeed> {
  return (await apiClient.get<NotificationFeed>('/api/v1/notifications/my')).data
}

export async function markNotificationRead(notificationId: number): Promise<AppNotificationSummary> {
  return (await apiClient.patch<AppNotificationSummary>(`/api/v1/notifications/${notificationId}/read`)).data
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/api/v1/notifications/my/read')
}
