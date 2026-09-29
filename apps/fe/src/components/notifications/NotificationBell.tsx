import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../notifications/NotificationContext";
import {
  formatRelativeTime,
  NOTIFICATION_TONE,
  notificationLink,
} from "../../notifications/notificationLink";
import type { AppNotification } from "../../types/notification";
import "./NotificationBell.css";

export function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-1.7 1.7A1 1 0 0 0 4 19.4h16a1 1 0 0 0 .7-1.7L19 16Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    hasMore,
    loading,
    error,
    connected,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Close on outside click and on Escape (returning focus to the bell).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSelect(notification: AppNotification) {
    void markRead(notification.id);
    const link = notificationLink(notification);
    if (link) {
      setOpen(false);
      navigate(link);
    }
  }

  const badge = unreadCount > 99 ? "99+" : String(unreadCount);
  const label =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`notification-bell__button${open ? " notification-bell__button--open" : ""}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notification-bell__badge" aria-hidden="true">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          className="notification-panel"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="notification-panel__header">
            <div>
              <h2 className="notification-panel__title">Notifications</h2>
              {!connected && (
                <p className="notification-panel__status">Reconnecting to live updates…</p>
              )}
            </div>
            <button
              type="button"
              className="notification-panel__mark-all"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>

          {error && <p className="notification-panel__error">{error}</p>}

          {notifications.length === 0 && !loading && !error ? (
            <div className="notification-panel__empty">
              <BellIcon />
              <p>You're all caught up.</p>
              <span>We'll let you know when something needs your attention.</span>
            </div>
          ) : (
            <ul className="notification-panel__list">
              {notifications.map((notification) => {
                const unread = !notification.readAt;
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={`notification-item notification-item--${NOTIFICATION_TONE[notification.type] ?? "info"}${
                        unread ? " notification-item--unread" : ""
                      }`}
                      onClick={() => handleSelect(notification)}
                    >
                      <span className="notification-item__dot" aria-hidden="true" />
                      <span className="notification-item__body">
                        <span className="notification-item__title">
                          {notification.title}
                          {unread && <span className="visually-hidden"> (unread)</span>}
                        </span>
                        <span className="notification-item__message">{notification.message}</span>
                        <time
                          className="notification-item__time"
                          dateTime={notification.createdAt}
                          title={new Date(notification.createdAt).toLocaleString()}
                        >
                          {formatRelativeTime(notification.createdAt)}
                        </time>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {(hasMore || (loading && notifications.length > 0)) && (
            <div className="notification-panel__footer">
              <button
                type="button"
                className="notification-panel__more"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
          {loading && notifications.length === 0 && (
            <p className="notification-panel__loading">Loading…</p>
          )}
        </div>
      )}
    </div>
  );
}
