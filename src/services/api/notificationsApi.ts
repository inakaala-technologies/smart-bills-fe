import { apiClient } from './httpClient'
import type { AppNotificationSummary, AppointmentSummary, NotificationFeed } from './types'

const LOCAL_NOTIFICATIONS_KEY = 'bhive_local_notifications'

export function getLocalNotifications(): AppNotificationSummary[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLocalNotification(notification: AppNotificationSummary): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  try {
    const current = getLocalNotifications()
    const filtered = current.filter((item) => item.id !== notification.id)
    filtered.unshift(notification)
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(filtered.slice(0, 50)))
  } catch {
    // Ignore storage quota errors
  }
}

export function markLocalNotificationRead(notificationId: number): AppNotificationSummary | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null
  try {
    const current = getLocalNotifications()
    const nowIso = new Date().toISOString()
    let updated: AppNotificationSummary | null = null
    const modified = current.map((item) => {
      if (item.id === notificationId) {
        updated = { ...item, readAt: item.readAt ?? nowIso }
        return updated
      }
      return item
    })
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(modified))
    return updated
  } catch {
    return null
  }
}

export function markAllLocalNotificationsRead(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  try {
    const current = getLocalNotifications()
    const nowIso = new Date().toISOString()
    const modified = current.map((item) => ({ ...item, readAt: item.readAt ?? nowIso }))
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(modified))
  } catch {
    // Ignore storage quota errors
  }
}

export function notifyAppointmentBooked(
  appointment: Partial<AppointmentSummary> & { id: number },
  businessName?: string,
): AppNotificationSummary {
  const serviceLabel = appointment.serviceName?.trim() || 'Appointment'
  const notif: AppNotificationSummary = {
    id: appointment.id ? appointment.id * 100000 + Math.floor(Math.random() * 1000) : Date.now(),
    type: 'APPOINTMENT_BOOKED',
    title: 'New appointment booked',
    message: `Appointment for ${serviceLabel} was booked${businessName ? ` with ${businessName}` : ''}.`,
    targetUrl: `/dashboard?tab=appointments&appointmentId=${appointment.id}`,
    appointmentId: appointment.id,
    createdAt: appointment.createdAt || new Date().toISOString(),
    readAt: null,
  }

  saveLocalNotification(notif)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bhive:notification-added', { detail: notif }))
  }

  return notif
}

export async function fetchMyNotifications(): Promise<NotificationFeed> {
  const localList = getLocalNotifications()

  try {
    const response = await apiClient.get<NotificationFeed>('/api/v1/notifications/my')
    const remoteList = response.data?.notifications ?? []

    // Merge remote notifications and local notifications, avoiding duplicates
    const seenIds = new Set<number>()
    const merged: AppNotificationSummary[] = []

    for (const item of remoteList) {
      seenIds.add(item.id)
      merged.push(item)
    }

    for (const item of localList) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id)
        merged.push(item)
      }
    }

    // Sort descending by creation date
    merged.sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())

    const unreadCount = merged.filter((item) => !item.readAt).length
    return { notifications: merged, unreadCount }
  } catch {
    // If remote fails, fallback gracefully to local notifications
    const unreadCount = localList.filter((item) => !item.readAt).length
    return { notifications: localList, unreadCount }
  }
}

export async function markNotificationRead(notificationId: number): Promise<AppNotificationSummary> {
  const localUpdated = markLocalNotificationRead(notificationId)

  try {
    const remoteResponse = await apiClient.patch<AppNotificationSummary>(`/api/v1/notifications/${notificationId}/read`)
    return remoteResponse.data
  } catch {
    if (localUpdated) return localUpdated
    return {
      id: notificationId,
      type: 'GENERAL',
      title: 'Notification',
      message: '',
      createdAt: new Date().toISOString(),
      readAt: new Date().toISOString(),
    }
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  markAllLocalNotificationsRead()
  try {
    await apiClient.patch('/api/v1/notifications/my/read')
  } catch {
    // Graceful fallback
  }
}
