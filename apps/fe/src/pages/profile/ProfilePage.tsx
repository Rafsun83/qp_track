import { useEffect, useState } from "react";
import { getUserById } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import type { User } from "../../types/user";
import "./ProfilePage.css";

export function ProfilePage() {
  const { token, userId } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !userId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getUserById(token, userId)
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  return (
    <div>
      <h1 className="profile-page__title">Profile</h1>
      <p className="profile-page__subtitle">Your account details.</p>

      {loading && <p className="profile-page__status">Loading profile...</p>}
      {!loading && error && <p className="profile-page__status">{error}</p>}

      {!loading && !error && user && (
        <dl className="profile-details">
          <div className="profile-details__row">
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div className="profile-details__row">
            <dt>Username</dt>
            <dd>{user.userName}</dd>
          </div>
          <div className="profile-details__row">
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="profile-details__row">
            <dt>Location</dt>
            <dd>{user.location}</dd>
          </div>
          <div className="profile-details__row">
            <dt>Login count</dt>
            <dd>{user.loginCount}</dd>
          </div>
          <div className="profile-details__row">
            <dt>Joined</dt>
            <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
