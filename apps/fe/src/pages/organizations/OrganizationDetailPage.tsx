import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  addOrganizationMember,
  getOrganizationById,
  removeOrganizationMember,
} from "../../api/organizations";
import { searchUsersByUserName } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import { Alert } from "../../components/ui/Alert";
import type { Organization, OrganizationRole } from "../../types/organization";
import type { User } from "../../types/user";
import "./OrganizationDetailPage.css";

// OWNER is assigned automatically on org creation - adding a second owner isn't a normal flow.
const ASSIGNABLE_ROLES: OrganizationRole[] = ["ADMIN", "MEMBER"];

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, userId } = useAuth();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [role, setRole] = useState<OrganizationRole>("MEMBER");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const loadOrganization = useCallback(() => {
    if (!token || !id) return;
    setLoading(true);
    setLoadError(null);
    getOrganizationById(token, id)
      .then(setOrganization)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load organization."))
      .finally(() => setLoading(false));
  }, [token, id]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  // Debounced username search so the owner can pick a member without knowing their user id.
  useEffect(() => {
    if (!token || selectedUser || userQuery.trim().length === 0) {
      setUserResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsersByUserName(token, userQuery.trim())
        .then((results) => {
          if (!cancelled) setUserResults(results);
        })
        .catch(() => {
          if (!cancelled) setUserResults([]);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, userQuery, selectedUser]);

  const currentMembership = organization?.members?.find((member) => member.userId === userId);
  const isOwner = currentMembership?.role === "OWNER";

  async function handleAddMember(event: FormEvent) {
    event.preventDefault();
    if (!token || !id || !selectedUser) return;

    setAddError(null);
    setAdding(true);
    try {
      await addOrganizationMember(token, id, { userId: selectedUser.id, role });
      setSelectedUser(null);
      setUserQuery("");
      setUserResults([]);
      setRole("MEMBER");
      loadOrganization();
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Failed to add member.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember(memberUserId: string) {
    if (!token || !id) return;

    setRemoveError(null);
    setRemovingUserId(memberUserId);
    try {
      await removeOrganizationMember(token, id, memberUserId);
      loadOrganization();
    } catch (err) {
      setRemoveError(err instanceof ApiError ? err.message : "Failed to remove member.");
    } finally {
      setRemovingUserId(null);
    }
  }

  if (loading) return <p className="org-detail__status">Loading organization...</p>;
  if (loadError) return <Alert variant="error">{loadError}</Alert>;
  if (!organization) return <p className="org-detail__status">Organization not found.</p>;

  return (
    <div className="org-detail">
      <div className="org-detail__main">
        <Link to="/organizations" className="org-detail__back">
          ← Organizations
        </Link>
        <h1 className="org-detail__title">{organization.name}</h1>
        <p className="org-detail__meta">
          Created {new Date(organization.createdAt).toLocaleDateString()}
        </p>

        {isOwner && (
          <form className="org-add-member-form" onSubmit={handleAddMember}>
            <h2 className="org-add-member-form__title">Add member</h2>

            <div className="form-field">
              <label htmlFor="member-search">User</label>
              <input
                id="member-search"
                type="text"
                placeholder="Search by username"
                value={selectedUser ? selectedUser.userName : userQuery}
                onChange={(event) => {
                  setSelectedUser(null);
                  setUserQuery(event.target.value);
                }}
                autoComplete="off"
              />
              {userResults.length > 0 && (
                <ul className="org-user-suggestions">
                  {userResults.map((candidate) => (
                    <li key={candidate.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(candidate);
                          setUserResults([]);
                        }}
                      >
                        {candidate.userName} ({candidate.name})
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="member-role">Role</label>
              <select
                id="member-role"
                value={role}
                onChange={(event) => setRole(event.target.value as OrganizationRole)}
              >
                {ASSIGNABLE_ROLES.map((assignableRole) => (
                  <option key={assignableRole} value={assignableRole}>
                    {assignableRole}
                  </option>
                ))}
              </select>
            </div>

            {addError && <Alert variant="error">{addError}</Alert>}

            <button type="submit" disabled={adding || !selectedUser}>
              {adding ? "Adding..." : "Add member"}
            </button>
          </form>
        )}
      </div>

      <aside className="org-detail__members">
        <h2 className="org-detail__members-title">Members</h2>
        {removeError && <Alert variant="error">{removeError}</Alert>}
        <ul className="org-member-list">
          {organization.members?.map((member) => (
            <li key={member.id} className="org-member-list__item">
              <div>
                <div className="org-member-list__name">{member.user?.name ?? member.userId}</div>
                <div className="org-member-list__role">{member.role}</div>
              </div>
              {isOwner && (
                <button
                  type="button"
                  className="org-member-list__remove"
                  disabled={removingUserId === member.userId}
                  onClick={() => handleRemoveMember(member.userId)}
                >
                  {removingUserId === member.userId ? "Removing..." : "Remove"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
