import type { StateCreator } from 'zustand';
import type { Notification } from '@/types';
import type { NotificationsRepo } from '@/lib/repos';

export interface NotificationsSlice {
  // ── Normalized store ──────────────────────────────────────────────
  /** All known notifications keyed by id — single source of truth for content */
  byId: Record<string, Notification>;

  /**
   * Ordered IDs per named view.
   * Bell uses 'bell:all' and 'bell:unread'.
   * Page uses legacy `notifications[]` + `notifNextCursor`.
   * Realtime events update byId and all 'bell:*' views automatically.
   */
  viewIds: Record<string, string[]>;

  /** Per-view pagination cursor (Bell views: 'bell:all', 'bell:unread'; legacy: use notifNextCursor) */
  viewCursors: Record<string, string | null>;

  /** Authoritative unread count from the last server GET or PATCH response */
  serverUnreadCount: number;

  // ── Legacy flat state (used by page and tests) ────────────────────
  /** Page's flat notification list — kept for backward compat */
  notifications: Notification[];
  /** Page's pagination cursor — kept for backward compat */
  notifNextCursor: string | null;

  // ── New per-view actions ──────────────────────────────────────────
  /**
   * Replace one view's data without touching other views or the page cursor.
   * Bell calls setViewPage('bell:all', ...) — does NOT clear notifNextCursor.
   */
  setViewPage(viewKey: string, notifs: Notification[], cursor: string | null, serverUnreadCount?: number): void;
  appendViewPage(viewKey: string, notifs: Notification[], cursor: string | null): void;
  /** Get ordered notification list for a named view (reads from byId) */
  getViewNotifications(viewKey: string): Notification[];

  // ── Legacy page actions ────────────────────────────────────────────
  /**
   * Replace the page list. Accepts the authoritative serverUnreadCount from the
   * server so initial loads and filter changes always reflect the true server count.
   * Pagination appends must NOT change serverUnreadCount — use _appendNotifications.
   */
  _setNotifications(next: Notification[], nextCursor?: string | null, serverUnreadCount?: number): void;
  /** Append next page — preserves the existing serverUnreadCount (same session). */
  _appendNotifications(next: Notification[], nextCursor: string | null): void;

  // ── Realtime ──────────────────────────────────────────────────────
  /**
   * Merge a single realtime notification into the store.
   * Updates byId, notifications[], all bell:* views, and serverUnreadCount.
   * Rollback-safe: only touches the specific notification, not full arrays.
   */
  upsertNotification(n: Notification): void;

  // ── Mutations (single-item optimistic rollback) ───────────────────
  markNotificationRead(id: string): Promise<void>;
  markNotificationUnread(id: string): Promise<void>;
  archiveNotification(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  emitNotification(params: Omit<Notification, 'id'>): Promise<Notification | null>;

  // ── Selectors ─────────────────────────────────────────────────────
  /** Computed from local notifications[] — for the authoritative badge use serverUnreadCount */
  unreadCount(): number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortNotifications(list: Notification[]): Notification[] {
  return [...list].sort((a, b) => {
    const ta = new Date(a.createdAt ?? 0).getTime();
    const tb = new Date(b.createdAt ?? 0).getTime();
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });
}

/** Returns true when a notification belongs in the named filter view. */
function notifMatchesFilter(n: Notification, filter: string): boolean {
  if (n.archivedAt) return filter === 'archived';
  switch (filter) {
    case 'all':      return true;
    case 'unread':   return !n.read;
    case 'info':     return n.type === 'info';
    case 'warning':  return n.type === 'warning';
    case 'critical': return n.type === 'critical';
    default:         return false;
  }
}

/** Remove `id` from a named view without mutation. No-op when view or id absent. */
function viewRemove(
  viewIds: Record<string, string[]>,
  viewKey: string,
  id: string,
): Record<string, string[]> {
  const ids = viewIds[viewKey];
  if (!ids) return viewIds;
  const next = ids.filter((x) => x !== id);
  return next.length === ids.length ? viewIds : { ...viewIds, [viewKey]: next };
}

/** Add `id` to the front of a view without mutation. No-op when already present. */
function viewPrepend(
  viewIds: Record<string, string[]>,
  viewKey: string,
  id: string,
): Record<string, string[]> {
  const ids = viewIds[viewKey];
  if (!ids) return { ...viewIds, [viewKey]: [id] };
  if (ids.includes(id)) return viewIds;
  return { ...viewIds, [viewKey]: [id, ...ids] };
}

// ─── Slice factory ──────────────────────────────────────────────────────────

export const createNotificationsSlice =
  (deps: { repo: NotificationsRepo }): StateCreator<NotificationsSlice> =>
  (set, get) => ({
    // Initial state
    byId: {},
    viewIds: {},
    viewCursors: {},
    serverUnreadCount: 0,
    notifications: [],
    notifNextCursor: null,

    // ── Per-view actions ────────────────────────────────────────────

    setViewPage(viewKey, notifs, cursor, unreadCount) {
      set((s) => {
        const newById = { ...s.byId };
        for (const n of notifs) newById[n.id] = n;
        return {
          byId:         newById,
          viewIds:      { ...s.viewIds,    [viewKey]: notifs.map((n) => n.id) },
          viewCursors:  { ...s.viewCursors, [viewKey]: cursor },
          ...(unreadCount !== undefined ? { serverUnreadCount: unreadCount } : {}),
        };
      });
    },

    appendViewPage(viewKey, notifs, cursor) {
      set((s) => {
        const newById     = { ...s.byId };
        for (const n of notifs) newById[n.id] = n;
        const existing    = s.viewIds[viewKey] ?? [];
        const existingSet = new Set(existing);
        const newIds      = notifs.filter((n) => !existingSet.has(n.id)).map((n) => n.id);
        return {
          byId:         newById,
          viewIds:      { ...s.viewIds,    [viewKey]: [...existing, ...newIds] },
          viewCursors:  { ...s.viewCursors, [viewKey]: cursor },
        };
      });
    },

    getViewNotifications(viewKey) {
      const ids  = get().viewIds[viewKey] ?? [];
      const byId = get().byId;
      return ids.map((id) => byId[id]).filter((n): n is Notification => n !== undefined);
    },

    // ── Legacy page actions ─────────────────────────────────────────

    _setNotifications(next, nextCursor = null, serverUnreadCount) {
      set((s) => {
        const newById = { ...s.byId };
        for (const n of next) newById[n.id] = n;
        return {
          byId:            newById,
          notifications:   next,
          notifNextCursor: nextCursor ?? null,
          ...(serverUnreadCount !== undefined ? { serverUnreadCount } : {}),
        };
      });
    },

    _appendNotifications(next, nextCursor) {
      set((s) => {
        const newById  = { ...s.byId };
        for (const n of next) newById[n.id] = n;
        const existing = new Set(s.notifications.map((n) => n.id));
        const merged   = sortNotifications([
          ...s.notifications,
          ...next.filter((n) => !existing.has(n.id)),
        ]);
        return {
          byId:            newById,
          notifications:   merged,
          notifNextCursor: nextCursor,
          // Pagination preserves serverUnreadCount — same user, same session
        };
      });
    },

    // ── Realtime ────────────────────────────────────────────────────

    upsertNotification(n) {
      set((s) => {
        const prev     = s.byId[n.id];
        const newById  = { ...s.byId };
        let newNotifs  = s.notifications;
        let newViewIds = s.viewIds;
        let newUnread  = s.serverUnreadCount;

        if (n.archivedAt) {
          newById[n.id] = n;
          newNotifs = s.notifications.filter((x) => x.id !== n.id);

          if (prev && !prev.read && !prev.archivedAt) {
            newUnread = Math.max(0, s.serverUnreadCount - 1);
          }

          for (const key of Object.keys(s.viewIds)) {
            if (key.startsWith('bell:')) {
              newViewIds = viewRemove(newViewIds, key, n.id);
            }
          }
        } else {
          newById[n.id] = n;

          const existingIdx = s.notifications.findIndex((x) => x.id === n.id);
          if (existingIdx >= 0) {
            const copy = [...s.notifications];
            copy[existingIdx] = n;
            newNotifs = copy;
          } else {
            newNotifs = sortNotifications([n, ...s.notifications]);
          }

          if (!prev && !n.read) {
            newUnread = s.serverUnreadCount + 1;
          } else if (prev && !prev.read && !prev.archivedAt && (n.read || n.archivedAt)) {
            newUnread = Math.max(0, s.serverUnreadCount - 1);
          } else if (prev && (prev.read || prev.archivedAt) && !n.read && !n.archivedAt) {
            newUnread = s.serverUnreadCount + 1;
          }

          // Reconcile bell views based on new notification state
          for (const viewKey of Object.keys(s.viewIds)) {
            if (!viewKey.startsWith('bell:')) continue;
            const filter = viewKey.slice('bell:'.length);
            const inView = notifMatchesFilter(n, filter);
            const ids    = s.viewIds[viewKey] ?? [];
            const hasIt  = ids.includes(n.id);

            if (inView && !hasIt) {
              newViewIds = viewPrepend(newViewIds, viewKey, n.id);
            } else if (!inView && hasIt) {
              newViewIds = viewRemove(newViewIds, viewKey, n.id);
            }
          }
        }

        return {
          byId:              newById,
          notifications:     newNotifs,
          viewIds:           newViewIds,
          serverUnreadCount: newUnread,
        };
      });
    },

    // ── Mutations — single-item optimistic rollback ─────────────────
    //
    // Rollback contract: NEVER restore an absolute captured count.
    // Apply the inverse of the operation's own delta so concurrent
    // realtime events that arrived during the request are preserved.

    async markNotificationRead(id) {
      const prevEntry = get().byId[id];
      if (!prevEntry) return;
      const wasUnread = !prevEntry.read && !prevEntry.archivedAt;
      const now = new Date().toISOString();

      // Optimistic update — delta: -1 if wasUnread
      set((s) => {
        let newViewIds = s.viewIds;
        if (wasUnread) newViewIds = viewRemove(newViewIds, 'bell:unread', id);
        return {
          byId:         { ...s.byId, [id]: { ...s.byId[id]!, read: true, readAt: now } },
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true, readAt: now } : n
          ),
          serverUnreadCount: wasUnread
            ? Math.max(0, s.serverUnreadCount - 1)
            : s.serverUnreadCount,
          viewIds: newViewIds,
        };
      });

      try {
        await deps.repo.markRead(id);
      } catch {
        // Delta rollback: undo the -1; concurrent unread count changes are preserved
        set((s) => {
          let newViewIds = s.viewIds;
          if (wasUnread) newViewIds = viewPrepend(newViewIds, 'bell:unread', id);
          return {
            byId:         { ...s.byId, [id]: prevEntry },
            notifications: s.notifications.map((n) => (n.id === id ? prevEntry : n)),
            serverUnreadCount: wasUnread
              ? s.serverUnreadCount + 1
              : s.serverUnreadCount,
            viewIds: newViewIds,
          };
        });
      }
    },

    async markNotificationUnread(id) {
      const prevEntry = get().byId[id];
      if (!prevEntry) return;
      const wasRead = prevEntry.read && !prevEntry.archivedAt;

      // Optimistic update — delta: +1 if wasRead
      set((s) => {
        let newViewIds = s.viewIds;
        if (wasRead) newViewIds = viewPrepend(newViewIds, 'bell:unread', id);
        return {
          byId:         { ...s.byId, [id]: { ...s.byId[id]!, read: false, readAt: null } },
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: false, readAt: null } : n
          ),
          serverUnreadCount: wasRead
            ? s.serverUnreadCount + 1
            : s.serverUnreadCount,
          viewIds: newViewIds,
        };
      });

      try {
        await deps.repo.markUnread(id);
      } catch {
        // Delta rollback: undo the +1
        set((s) => {
          let newViewIds = s.viewIds;
          if (wasRead) newViewIds = viewRemove(newViewIds, 'bell:unread', id);
          return {
            byId:         { ...s.byId, [id]: prevEntry },
            notifications: s.notifications.map((n) => (n.id === id ? prevEntry : n)),
            serverUnreadCount: wasRead
              ? Math.max(0, s.serverUnreadCount - 1)
              : s.serverUnreadCount,
            viewIds: newViewIds,
          };
        });
      }
    },

    async archiveNotification(id) {
      const prevEntry  = get().byId[id];
      if (!prevEntry) return;
      const wasUnread  = !prevEntry.read && !prevEntry.archivedAt;
      const wasActive  = !prevEntry.archivedAt;
      const archivedAt = new Date().toISOString();

      // Optimistic update — delta: -1 if wasUnread; remove from all bell views
      set((s) => {
        let newViewIds = s.viewIds;
        for (const key of Object.keys(s.viewIds)) {
          if (key.startsWith('bell:')) newViewIds = viewRemove(newViewIds, key, id);
        }
        return {
          byId:          { ...s.byId, [id]: { ...s.byId[id]!, archivedAt } },
          notifications:  s.notifications.filter((n) => n.id !== id),
          serverUnreadCount: wasUnread
            ? Math.max(0, s.serverUnreadCount - 1)
            : s.serverUnreadCount,
          viewIds: newViewIds,
        };
      });

      try {
        await deps.repo.archive(id);
      } catch {
        // Delta rollback: undo the -1; re-add to applicable bell views
        set((s) => {
          let newViewIds = s.viewIds;
          if (wasActive) {
            for (const key of Object.keys(s.viewIds)) {
              if (!key.startsWith('bell:')) continue;
              const filter = key.slice('bell:'.length);
              if (notifMatchesFilter(prevEntry, filter)) {
                newViewIds = viewPrepend(newViewIds, key, id);
              }
            }
          }
          return {
            byId:         { ...s.byId, [id]: prevEntry },
            notifications: sortNotifications([prevEntry, ...s.notifications]),
            serverUnreadCount: wasUnread
              ? s.serverUnreadCount + 1
              : s.serverUnreadCount,
            viewIds: newViewIds,
          };
        });
      }
    },

    async markAllNotificationsRead() {
      const changedEntries = Object.entries(get().byId)
        .filter(([, n]) => !n.read && !n.archivedAt)
        .map(([id, n]) => [id, n] as [string, Notification]);
      // Capture delta = entire serverUnreadCount we're about to zero out
      const unreadDelta = get().serverUnreadCount;
      const now = new Date().toISOString();

      // Optimistic update — set count to 0, clear bell:unread
      set((s) => {
        const newById = { ...s.byId };
        for (const [cid] of changedEntries) {
          if (newById[cid]) newById[cid] = { ...newById[cid]!, read: true, readAt: now };
        }
        let newViewIds = s.viewIds;
        if ('bell:unread' in s.viewIds) {
          newViewIds = { ...s.viewIds, 'bell:unread': [] };
        }
        return {
          byId:         newById,
          notifications: s.notifications.map((n) =>
            !n.read && !n.archivedAt ? { ...n, read: true, readAt: now } : n
          ),
          serverUnreadCount: 0,
          viewIds: newViewIds,
        };
      });

      try {
        await deps.repo.markAllRead();
      } catch {
        // Delta rollback: add unreadDelta back to current count so concurrent
        // realtime events (that changed count from 0) are preserved.
        set((s) => {
          const newById  = { ...s.byId };
          for (const [cid, prev] of changedEntries) {
            if (newById[cid]) newById[cid] = prev;
          }
          const prevById = new Map(changedEntries);

          // Restore bell:unread with rolled-back ids
          let newViewIds = s.viewIds;
          if ('bell:unread' in s.viewIds) {
            const existingUnread = s.viewIds['bell:unread'] ?? [];
            const existingSet    = new Set(existingUnread);
            const toRestore      = changedEntries
              .map(([cid]) => cid)
              .filter((cid) => !existingSet.has(cid));
            if (toRestore.length > 0) {
              newViewIds = { ...s.viewIds, 'bell:unread': [...toRestore, ...existingUnread] };
            }
          }

          return {
            byId:         newById,
            notifications: s.notifications.map((n) => prevById.get(n.id) ?? n),
            serverUnreadCount: s.serverUnreadCount + unreadDelta,
            viewIds: newViewIds,
          };
        });
      }
    },

    async emitNotification(params) {
      try {
        return await deps.repo.create(params);
      } catch {
        return null;
      }
    },

    unreadCount() {
      return get().notifications.filter((n) => !n.read && !n.archivedAt).length;
    },
  });
