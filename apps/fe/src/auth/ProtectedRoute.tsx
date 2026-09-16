import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

/** Guards a route subtree: unauthenticated visitors are sent to /login. */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Guards login/register: an already-authenticated user is sent straight to /dashboard. */
export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
