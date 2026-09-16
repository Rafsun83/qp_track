import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { createOrganization, getMyOrganizations } from "../../api/organizations";
import { useAuth } from "../../auth/AuthContext";
import { Alert } from "../../components/ui/Alert";
import type { Organization } from "../../types/organization";
import "./OrganizationsPage.css";

export function OrganizationsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    getMyOrganizations(token)
      .then((data) => {
        if (!cancelled) setOrganizations(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load organizations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!token) return;

    setCreateError(null);
    setCreating(true);
    try {
      const organization = await createOrganization(token, name);
      navigate(`/organizations/${organization.id}`);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create organization.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1 className="organizations-page__title">Organizations</h1>
      <p className="organizations-page__subtitle">Organizations you own.</p>

      <form className="org-create-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Organization name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <button type="submit" disabled={creating}>
          {creating ? "Creating..." : "Create organization"}
        </button>
      </form>
      {createError && <Alert variant="error">{createError}</Alert>}

      {loading && <p className="organizations-page__status">Loading organizations...</p>}
      {!loading && loadError && <Alert variant="error">{loadError}</Alert>}

      {!loading && !loadError && organizations.length === 0 && (
        <p className="organizations-page__status">You don't own any organizations yet.</p>
      )}

      {!loading && !loadError && organizations.length > 0 && (
        <ul className="org-list">
          {organizations.map((organization) => (
            <li key={organization.id} className="org-list__item">
              <Link to={`/organizations/${organization.id}`} className="org-list__name">
                {organization.name}
              </Link>
              <span className="org-list__meta">{organization.members?.length ?? 0} member(s)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
