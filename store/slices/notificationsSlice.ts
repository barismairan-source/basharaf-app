import type { StateCreator } from 'zustand';
import type { Notification } from '@/types';
import type { NotificationsRepo } from '@/lib/repos';

export interface NotificationsSlice {
  notifications: Notification[];
  _setNotifications: (next: Notification[]) => void;

  /** علامت‌گذاری یک اعلان به خوانده‌شده */
  markNotificationRead: (id: string) => Promise<void>;

  /** علامت‌گذاری همه به خوانده‌شده */
  markAllNotificationsRead: () => Promise<void>;

  /**
   * ساختن اعلان جدید — معمولاً توسط transactionsSlice فراخوانی می‌شود
   * (وقتی تراکنش pending ثبت می‌شود).
   */
  emitNotification: (
    params: Omit<Notification, 'id'>
  ) => Promise<Notification | null>;

  /** تعداد اعلان‌های خوانده‌نشده — selector */
  unreadCount: () => number;
}

export const createNotificationsSlice =
  (deps: { repo: NotificationsRepo }): StateCreator<NotificationsSlice> =>
  (set, get) => ({
    notifications: [],

    _setNotifications(next) {
      set({ notifications: next });
    },

    async markNotificationRead(id) {
      // Optimistic: update local state immediately so badge/dot disappear instantly
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      }));
      await deps.repo.markRead(id);
    },

    async markAllNotificationsRead() {
      // Optimistic: mark all read locally before API round-trip
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      }));
      await deps.repo.markAllRead();
    },

    async emitNotification(params) {
      try {
        return await deps.repo.create(params);
      } catch {
        return null;
      }
    },

    unreadCount() {
      return get().notifications.filter((n) => !n.read).length;
    },
  });
