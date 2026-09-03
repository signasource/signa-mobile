import { apiClient } from "./client";

export type NotificationCode =
  | "DAILY_REMINDER"
  | "COURSE_COMPLETED"
  | "STREAK_REMINDER"
  | "NEW_COURSE_AVAILABLE"
  | "GLOBAL_ANNOUNCEMENT"
  | "FRIEND_REQUEST_RECEIVED"
  | "FRIEND_REQUEST_ACCEPTED"
  | "FRIEND_EVENT_LIKED";

export interface AppNotification {
  id: number;
  code: NotificationCode;
  title: string;
  body: string;
  read: boolean;
  sentAt: string;
  readAt: string | null;
  /** Datos del evento que la originó (p. ej. `friend`, `friendUsername`, `friendId`). */
  metadata: Record<string, string> | null;
}

/** Página de Spring Data; sólo se declaran los campos que consume la app. */
export interface NotificationPage {
  content: AppNotification[];
  number: number;
  totalElements: number;
  last: boolean;
}

export const notificationsApi = {
  getInbox: (page = 0, size = 30) =>
    apiClient.get<NotificationPage>("/notifications", { params: { page, size } }),

  getUnreadCount: () => apiClient.get<{ unreadCount: number }>("/notifications/unread-count"),

  markAsRead: (id: number) => apiClient.patch<void>(`/notifications/${id}/read`),

  markAllAsRead: () => apiClient.patch<void>("/notifications/read-all"),
};
