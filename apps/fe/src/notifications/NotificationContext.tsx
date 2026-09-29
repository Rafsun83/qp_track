import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io } from "socket.io-client";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import { useAuth } from "../auth/AuthContext";
import type { AppNotification } from "../types/notification";

const PAGE_SIZE = 10;
const TOAST_DURATION_MS = 5000;

type Listener = (notification: AppNotification) => void;

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  /** Whether the realtime socket is currently connected. */
  connected: boolean;
  /** Notifications that arrived live and are still showing as toasts. */
  toasts: AppNotification[];
  loadMore: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismissToast: (id: string) => void;
  /** Lets a page react to live notifications (e.g. refetch its tickets). */
  subscribe: (listener: Listener) => () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

/**
 * Mounted inside the authenticated layout, so it only exists while signed in:
 * logging out unmounts it, which closes the socket and drops all state.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  const listenersRef = useRef(new Set<Listener>());
  const pushedIdsRef = useRef(new Set<string>());
  const toastTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );

  // Replaces the list with the first page and re-reads the unread count.
  // Runs on mount and after every socket reconnect, to catch up on anything
  // pushed while we were disconnected.
  const refresh = useCallback(() => {
    if (!token) return;
    Promise.all([
      getNotifications(token, { page: 1, limit: PAGE_SIZE }),
      getUnreadNotificationCount(token),
    ])
      .then(([firstPage, { count }]) => {
        setNotifications(firstPage.items);
        setTotal(firstPage.total);
        setPage(1);
        setUnreadCount(count);
        setError(null);
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load notifications.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  const dismissToast = useCallback((id: string) => {
    clearTimeout(toastTimersRef.current.get(id));
    toastTimersRef.current.delete(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (notification: AppNotification) => {
      // Keep at most 3 on screen - newest on top.
      setToasts((prev) => [notification, ...prev].slice(0, 3));
      toastTimersRef.current.set(
        notification.id,
        setTimeout(() => dismissToast(notification.id), TOAST_DURATION_MS),
      );
    },
    [dismissToast],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!token) return;

    // Same origin as the page: Vite proxies /socket.io to the backend in dev.
    const socket = io("/notifications", { auth: { token } });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.io.on("reconnect", refresh);

    socket.on("notification:new", (notification: AppNotification) => {
      // Guard side effects with a ref - a state updater isn't guaranteed to
      // have run by the time setState returns, so it can't tell us this.
      if (pushedIdsRef.current.has(notification.id)) return;
      pushedIdsRef.current.add(notification.id);

      setNotifications((prev) =>
        prev.some((existing) => existing.id === notification.id)
          ? prev
          : [notification, ...prev],
      );
      setTotal((prev) => prev + 1);
      showToast(notification);
      listenersRef.current.forEach((listener) => listener(notification));
    });

    socket.on("notification:unread-count", ({ count }: { count: number }) =>
      setUnreadCount(count),
    );

    return () => {
      socket.io.off("reconnect", refresh);
      socket.disconnect();
    };
  }, [token, refresh, showToast]);

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const loadMore = useCallback(() => {
    if (!token) return;
    const nextPage = page + 1;
    setLoading(true);
    getNotifications(token, { page: nextPage, limit: PAGE_SIZE })
      .then((result) => {
        setNotifications((prev) => {
          // A live push may have shifted the pages; skip anything we already have.
          const seen = new Set(prev.map((n) => n.id));
          return [...prev, ...result.items.filter((n) => !seen.has(n.id))];
        });
        setTotal(result.total);
        setPage(nextPage);
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load notifications.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token, page]);

  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      dismissToast(id);
      const target = notifications.find((n) => n.id === id);
      if (!target || target.readAt) return;

      // Optimistic; the server also pushes the authoritative count to every tab.
      const readAt = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await markNotificationRead(token, id);
      } catch {
        refresh();
      }
    },
    [token, notifications, refresh, dismissToast],
  );

  const markAllRead = useCallback(async () => {
    if (!token) return;
    toastTimersRef.current.forEach(clearTimeout);
    toastTimersRef.current.clear();
    setToasts([]);
    const readAt = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt })),
    );
    setUnreadCount(0);
    try {
      await markAllNotificationsRead(token);
    } catch {
      refresh();
    }
  }, [token, refresh]);

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      hasMore: notifications.length < total,
      loading,
      error,
      connected,
      toasts,
      loadMore,
      markRead,
      markAllRead,
      dismissToast,
      subscribe,
    }),
    [
      notifications,
      unreadCount,
      total,
      loading,
      error,
      connected,
      toasts,
      loadMore,
      markRead,
      markAllRead,
      dismissToast,
      subscribe,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  return ctx;
}

/** Runs `listener` for every live notification while the calling component is mounted. */
export function useNotificationListener(listener: Listener): void {
  const { subscribe } = useNotifications();
  const listenerRef = useRef(listener);
  useEffect(() => {
    listenerRef.current = listener;
  });
  useEffect(() => subscribe((n) => listenerRef.current(n)), [subscribe]);
}
