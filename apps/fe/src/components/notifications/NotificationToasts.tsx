import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../notifications/NotificationContext";
import { NOTIFICATION_TONE, notificationLink } from "../../notifications/notificationLink";
import { BellIcon } from "./NotificationBell";
import "./NotificationToasts.css";

/** Short-lived pop-ups for notifications that arrive while the app is open. */
export function NotificationToasts() {
  const { toasts, dismissToast, markRead } = useNotifications();
  const navigate = useNavigate();

  return (
    // Polite live region: screen readers announce new toasts without interrupting.
    <div className="notification-toasts" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const link = notificationLink(toast);
        return (
          <div
            key={toast.id}
            className={`notification-toast notification-toast--${NOTIFICATION_TONE[toast.type] ?? "info"}`}
          >
            <button
              type="button"
              className="notification-toast__main"
              onClick={() => {
                // markRead also dismisses the toast.
                void markRead(toast.id);
                if (link) navigate(link);
              }}
            >
              <span className="notification-toast__icon" aria-hidden="true">
                <BellIcon />
              </span>
              <span className="notification-toast__text">
                <strong>{toast.title}</strong>
                <span>{toast.message}</span>
              </span>
            </button>
            <button
              type="button"
              className="notification-toast__close"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
