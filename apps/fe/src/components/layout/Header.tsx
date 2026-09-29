import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { NotificationBell } from "../notifications/NotificationBell";
import "./Header.css";

export function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="app-header">
      <span className="app-header__brand">User Directory</span>
      <div className="app-header__actions">
        <NotificationBell />
        <button type="button" className="app-header__sign-out" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
