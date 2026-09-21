import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getOrganizationById } from "../../api/organizations";
import {
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
} from "../../api/projectMembers";
import {
  deleteProject,
  getProjectById,
  updateProject,
} from "../../api/projects";
import { getUserById, searchUsersByUserName } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import { Alert } from "../../components/ui/Alert";
import { Modal } from "../../components/ui/Modal";
import type { Organization } from "../../types/organization";
import type { Project, ProjectRole, ProjectStatus } from "../../types/project";
import type { User } from "../../types/user";
import "./ProjectDetailPage.css";

const ASSIGNABLE_ROLES: ProjectRole[] = ["LEAD", "CONTRIBUTOR", "VIEWER"];
const STATUS_OPTIONS: ProjectStatus[] = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
  "CANCELLED",
];

export function ProjectDetailPage() {
  const { organizationId, projectId } = useParams<{
    organizationId: string;
    projectId: string;
  }>();
  const { token, userId } = useAuth();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ProjectMember rows don't carry a nested `user` (unlike OrganizationMember),
  // so member names are resolved with individual lookups here.
  const [memberUsers, setMemberUsers] = useState<Record<string, User>>({});

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("PLANNING");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMemberRole, setNewMemberRole] = useState<ProjectRole>("CONTRIBUTOR");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState<string | null>(
    null,
  );
  const [roleDrafts, setRoleDrafts] = useState<Record<string, ProjectRole>>(
    {},
  );
  const [memberToRemove, setMemberToRemove] = useState<{
    userId: string;
    name: string;
  } | null>(null);

  const loadProject = useCallback(() => {
    if (!token || !organizationId || !projectId) return;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      getOrganizationById(token, organizationId),
      getProjectById(token, organizationId, projectId),
    ])
      .then(([org, proj]) => {
        setOrganization(org);
        setProject(proj);
        if (proj) {
          setName(proj.name);
          setDescription(proj.description);
          setKey(proj.key);
          setStatus(proj.status);
        }
      })
      .catch((err) =>
        setLoadError(
          err instanceof Error ? err.message : "Failed to load project.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token, organizationId, projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Resolve display names for member userIds we don't already have cached.
  useEffect(() => {
    if (!token || !project?.members) return;
    const missing = project.members
      .map((member) => member.userId)
      .filter((id) => !(id in memberUsers));
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(missing.map((id) => getUserById(token, id)))
      .then((users) => {
        if (cancelled) return;
        setMemberUsers((prev) => {
          const next = { ...prev };
          users.forEach((user) => {
            next[user.id] = user;
          });
          return next;
        });
      })
      .catch(() => {
        // Best-effort - fall back to showing the raw userId if a lookup fails.
      });

    return () => {
      cancelled = true;
    };
  }, [token, project, memberUsers]);

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

  const orgMembership = organization?.members?.find(
    (member) => member.userId === userId,
  );
  const canManageProject =
    orgMembership?.role === "OWNER" || orgMembership?.role === "ADMIN";

  const projectMembership = project?.members?.find(
    (member) => member.userId === userId,
  );
  const isProjectLead = projectMembership?.role === "LEAD";

  // Deleting a project now requires org OWNER *and* being this project's
  // LEAD (the backend checks both) - hide the action entirely otherwise
  // instead of letting the request fail with a 403.
  const canDeleteProject = orgMembership?.role === "OWNER" && isProjectLead;

  async function handleUpdateProject(event: FormEvent) {
    event.preventDefault();
    if (!token || !organizationId || !projectId) return;

    setSaveError(null);
    setSaving(true);
    try {
      await updateProject(token, organizationId, projectId, {
        name,
        description,
        key,
        status,
      });
      setEditModalOpen(false);
      loadProject();
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Failed to update project.",
      );
    } finally {
      setSaving(false);
    }
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setSaveError(null);
    setDeleteError(null);
    if (project) {
      setName(project.name);
      setDescription(project.description);
      setKey(project.key);
      setStatus(project.status);
    }
  }

  function closeDeleteConfirm() {
    setDeleteConfirmOpen(false);
    setDeleteError(null);
  }

  async function handleDeleteProject() {
    if (!token || !organizationId || !projectId) return;

    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteProject(token, organizationId, projectId);
      navigate(`/organizations/${organizationId}`);
    } catch (err) {
      setDeleteError(
        err instanceof ApiError
          ? err.message
          : "Failed to delete project.",
      );
      setDeleting(false);
    }
  }

  async function handleAddMember(event: FormEvent) {
    event.preventDefault();
    if (!token || !projectId || !selectedUser) return;

    setAddError(null);
    setAdding(true);
    try {
      await addProjectMember(token, projectId, {
        userId: selectedUser.id,
        role: newMemberRole,
      });
      setSelectedUser(null);
      setUserQuery("");
      setUserResults([]);
      setNewMemberRole("CONTRIBUTOR");
      setAddMemberModalOpen(false);
      loadProject();
    } catch (err) {
      setAddError(
        err instanceof ApiError ? err.message : "Failed to add member.",
      );
    } finally {
      setAdding(false);
    }
  }

  function closeAddMemberModal() {
    setAddMemberModalOpen(false);
    setAddError(null);
    setSelectedUser(null);
    setUserQuery("");
    setUserResults([]);
    setNewMemberRole("CONTRIBUTOR");
  }

  function closeRemoveMemberConfirm() {
    setMemberToRemove(null);
    setMemberActionError(null);
  }

  async function handleConfirmRemoveMember() {
    if (!token || !projectId || !memberToRemove) return;

    const { userId: memberUserId } = memberToRemove;
    setMemberActionError(null);
    setBusyUserId(memberUserId);
    try {
      await removeProjectMember(token, projectId, memberUserId);
      setMemberToRemove(null);
      loadProject();
    } catch (err) {
      setMemberActionError(
        err instanceof ApiError ? err.message : "Failed to remove member.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleSaveRole(memberUserId: string) {
    if (!token || !projectId) return;
    const nextRole = roleDrafts[memberUserId];
    if (!nextRole) return;

    setMemberActionError(null);
    setBusyUserId(memberUserId);
    try {
      await updateProjectMemberRole(token, projectId, memberUserId, {
        role: nextRole,
      });
      loadProject();
    } catch (err) {
      setMemberActionError(
        err instanceof ApiError ? err.message : "Failed to update role.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  if (loading)
    return <p className="project-detail__status">Loading project...</p>;
  if (loadError) return <Alert variant="error">{loadError}</Alert>;
  if (!project)
    return <p className="project-detail__status">Project not found.</p>;

  return (
    <div className="project-detail">
      <div className="project-detail__main">
        <Link
          to={`/organizations/${organizationId}`}
          className="project-detail__back"
        >
          ← {organization?.name ?? "Organization"}
        </Link>
        <div className="project-detail__title-row">
          <h1 className="project-detail__title">{project.name}</h1>
          {canManageProject && (
            <button
              type="button"
              className="project-detail__action-btn project-detail__action-btn--edit"
              onClick={() => setEditModalOpen(true)}
            >
              Edit project
            </button>
          )}
        </div>
        <p className="project-detail__meta">
          Key: {project.key} · Status{" "}
          <span
            className={`status-badge status-badge--${project.status.toLowerCase()}`}
          >
            {project.status}
          </span>{" "}
          · Created {new Date(project.createdAt).toLocaleDateString()}
        </p>
        <p className="project-detail__description">{project.description}</p>

        <Modal open={editModalOpen} onClose={closeEditModal} title="Update project">
          <form className="project-update-form" onSubmit={handleUpdateProject}>
            <div className="form-field">
              <label htmlFor="project-edit-name">Name</label>
              <input
                id="project-edit-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-field">
              <label htmlFor="project-edit-key">Key</label>
              <input
                id="project-edit-key"
                type="text"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="project-edit-description">Description</label>
              <input
                id="project-edit-description"
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="project-edit-status">Status</label>
              <select
                id="project-edit-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ProjectStatus)
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {saveError && <Alert variant="error">{saveError}</Alert>}

            <div className="project-update-form__actions">
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>

              {canDeleteProject && (
                <button
                  type="button"
                  className="project-update-form__delete"
                  onClick={() => {
                    setEditModalOpen(false);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  Delete project
                </button>
              )}
            </div>
          </form>
        </Modal>

        <Modal
          open={deleteConfirmOpen}
          onClose={closeDeleteConfirm}
          title="Delete project"
        >
          <div className="confirm-modal">
            <p className="confirm-modal__message">
              Delete project <strong>{project.name}</strong>? This cannot be
              undone.
            </p>

            {deleteError && <Alert variant="error">{deleteError}</Alert>}

            <div className="confirm-modal__actions">
              <button
                type="button"
                className="confirm-modal__cancel"
                disabled={deleting}
                onClick={closeDeleteConfirm}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-modal__confirm"
                disabled={deleting}
                onClick={handleDeleteProject}
              >
                {deleting ? "Deleting..." : "Delete project"}
              </button>
            </div>
          </div>
        </Modal>
      </div>

      <aside className="project-detail__members">
        <div className="project-detail__members-header">
          <h2 className="project-detail__members-title">Members</h2>
          {isProjectLead && (
            <button
              type="button"
              className="project-detail__action-btn"
              onClick={() => setAddMemberModalOpen(true)}
            >
              Add member
            </button>
          )}
        </div>

        <Modal
          open={addMemberModalOpen}
          onClose={closeAddMemberModal}
          title="Add member"
        >
          <form className="project-add-member-form" onSubmit={handleAddMember}>
            <div className="form-field">
              <label htmlFor="project-member-search">User</label>
              <input
                id="project-member-search"
                type="text"
                placeholder="Search by username"
                value={selectedUser ? selectedUser.userName : userQuery}
                onChange={(event) => {
                  setSelectedUser(null);
                  setUserQuery(event.target.value);
                }}
                autoComplete="off"
                autoFocus
              />
              {userResults.length > 0 && (
                <ul className="project-user-suggestions">
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
              <label htmlFor="project-member-role">Role</label>
              <select
                id="project-member-role"
                value={newMemberRole}
                onChange={(event) =>
                  setNewMemberRole(event.target.value as ProjectRole)
                }
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
        </Modal>

        {memberActionError && !memberToRemove && (
          <Alert variant="error">{memberActionError}</Alert>
        )}
        <ul className="project-member-list">
          {project.members?.map((member) => {
            const isBusy = busyUserId === member.userId;
            const draftRole = roleDrafts[member.userId] ?? member.role;
            const displayName =
              memberUsers[member.userId]?.name ?? member.userId;

            return (
              <li key={member.id} className="project-member-list__item">
                <div className="project-member-list__name">{displayName}</div>

                {isProjectLead ? (
                  <div className="project-member-list__role-editor">
                    <select
                      value={draftRole}
                      disabled={isBusy}
                      onChange={(event) =>
                        setRoleDrafts((prev) => ({
                          ...prev,
                          [member.userId]: event.target.value as ProjectRole,
                        }))
                      }
                    >
                      {ASSIGNABLE_ROLES.map((assignableRole) => (
                        <option key={assignableRole} value={assignableRole}>
                          {assignableRole}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="project-member-list__save"
                      disabled={isBusy || draftRole === member.role}
                      onClick={() => handleSaveRole(member.userId)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="project-member-list__remove"
                      disabled={isBusy}
                      onClick={() =>
                        setMemberToRemove({
                          userId: member.userId,
                          name: displayName,
                        })
                      }
                    >
                      {isBusy ? "Working..." : "Remove"}
                    </button>
                  </div>
                ) : (
                  <div className="project-member-list__role">
                    {member.role}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <Modal
          open={memberToRemove !== null}
          onClose={closeRemoveMemberConfirm}
          title="Remove member"
        >
          <div className="confirm-modal">
            <p className="confirm-modal__message">
              Remove <strong>{memberToRemove?.name}</strong> from this
              project?
            </p>

            {memberActionError && (
              <Alert variant="error">{memberActionError}</Alert>
            )}

            <div className="confirm-modal__actions">
              <button
                type="button"
                className="confirm-modal__cancel"
                disabled={busyUserId === memberToRemove?.userId}
                onClick={closeRemoveMemberConfirm}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-modal__confirm"
                disabled={busyUserId === memberToRemove?.userId}
                onClick={handleConfirmRemoveMember}
              >
                {busyUserId === memberToRemove?.userId
                  ? "Removing..."
                  : "Remove"}
              </button>
            </div>
          </div>
        </Modal>
      </aside>
    </div>
  );
}
