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
import {
  createSprint,
  deleteSprint,
  getSprintsForProject,
  updateSprint,
} from "../../api/sprints";
import { getUserById, searchUsersByUserName } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import { Alert } from "../../components/ui/Alert";
import { Modal } from "../../components/ui/Modal";
import type { Organization } from "../../types/organization";
import type { Project, ProjectRole, ProjectStatus } from "../../types/project";
import type { Sprint, SprintStatus } from "../../types/sprint";
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
const SPRINT_STATUS_OPTIONS: SprintStatus[] = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];

const MS_PER_DAY = 86_400_000;

/**
 * A sprint's `status` alone doesn't tell a reader *when* it sits relative to
 * today - two ACTIVE sprints with different end dates need to read
 * differently. This turns the dates + status into a short, unambiguous
 * "ends in 3 days" / "starts tomorrow" / "ended 2 days ago" label.
 */
function getSprintTiming(sprint: Sprint, now: Date = new Date()) {
  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);

  if (sprint.status === "CANCELLED") {
    return { label: "Cancelled", tone: "ended" as const };
  }
  if (sprint.status === "COMPLETED") {
    return { label: "Completed", tone: "ended" as const };
  }
  if (now < start) {
    const days = Math.ceil((start.getTime() - now.getTime()) / MS_PER_DAY);
    return {
      label: days <= 1 ? "Starts tomorrow" : `Starts in ${days} days`,
      tone: "upcoming" as const,
    };
  }
  if (now > end) {
    const days = Math.floor((now.getTime() - end.getTime()) / MS_PER_DAY);
    return {
      label: days <= 1 ? "Ended yesterday" : `Ended ${days} days ago`,
      tone: "ended" as const,
    };
  }
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / MS_PER_DAY);
  return {
    label: daysLeft <= 1 ? "Ends today" : `${daysLeft} days left`,
    tone: "active" as const,
  };
}

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

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [sprintsError, setSprintsError] = useState<string | null>(null);

  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [sprintName, setSprintName] = useState("");
  const [sprintStartDate, setSprintStartDate] = useState("");
  const [sprintEndDate, setSprintEndDate] = useState("");
  const [sprintStatus, setSprintStatus] = useState<SprintStatus>("PLANNED");
  const [savingSprint, setSavingSprint] = useState(false);
  const [sprintFormError, setSprintFormError] = useState<string | null>(null);

  const [sprintToDelete, setSprintToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deletingSprint, setDeletingSprint] = useState(false);
  const [deleteSprintError, setDeleteSprintError] = useState<string | null>(
    null,
  );

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

  const loadSprints = useCallback(() => {
    if (!token || !projectId) return;
    setSprintsLoading(true);
    setSprintsError(null);
    getSprintsForProject(token, projectId)
      .then(setSprints)
      .catch((err) =>
        setSprintsError(
          err instanceof Error ? err.message : "Failed to load sprints.",
        ),
      )
      .finally(() => setSprintsLoading(false));
  }, [token, projectId]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

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

  // Matches the backend: LEAD or CONTRIBUTOR can create/update sprints,
  // VIEWER is read-only, and only LEAD can delete one.
  const canManageSprints =
    projectMembership?.role === "LEAD" ||
    projectMembership?.role === "CONTRIBUTOR";

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

  function openCreateSprintModal() {
    setEditingSprintId(null);
    setSprintName("");
    setSprintStartDate("");
    setSprintEndDate("");
    setSprintStatus("PLANNED");
    setSprintFormError(null);
    setSprintModalOpen(true);
  }

  function openEditSprintModal(sprint: Sprint) {
    setEditingSprintId(sprint.id);
    setSprintName(sprint.name);
    setSprintStartDate(sprint.startDate.slice(0, 10));
    setSprintEndDate(sprint.endDate.slice(0, 10));
    setSprintStatus(sprint.status);
    setSprintFormError(null);
    setSprintModalOpen(true);
  }

  function closeSprintModal() {
    setSprintModalOpen(false);
    setSprintFormError(null);
  }

  async function handleSubmitSprint(event: FormEvent) {
    event.preventDefault();
    if (!token || !projectId) return;

    setSprintFormError(null);
    setSavingSprint(true);
    try {
      const payload = {
        name: sprintName,
        startDate: sprintStartDate,
        endDate: sprintEndDate,
        status: sprintStatus,
      };
      if (editingSprintId) {
        await updateSprint(token, projectId, editingSprintId, payload);
      } else {
        await createSprint(token, projectId, payload);
      }
      setSprintModalOpen(false);
      loadSprints();
    } catch (err) {
      setSprintFormError(
        err instanceof ApiError ? err.message : "Failed to save sprint.",
      );
    } finally {
      setSavingSprint(false);
    }
  }

  function closeDeleteSprintConfirm() {
    setSprintToDelete(null);
    setDeleteSprintError(null);
  }

  async function handleConfirmDeleteSprint() {
    if (!token || !projectId || !sprintToDelete) return;

    setDeleteSprintError(null);
    setDeletingSprint(true);
    try {
      await deleteSprint(token, projectId, sprintToDelete.id);
      setSprintToDelete(null);
      loadSprints();
    } catch (err) {
      setDeleteSprintError(
        err instanceof ApiError ? err.message : "Failed to delete sprint.",
      );
    } finally {
      setDeletingSprint(false);
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

        <div className="project-sprints">
          <div className="project-sprints__header">
            <h2 className="project-sprints__title">Sprints</h2>
            {canManageSprints && (
              <button
                type="button"
                className="project-detail__action-btn"
                onClick={openCreateSprintModal}
              >
                New sprint
              </button>
            )}
          </div>

          {sprintsLoading && (
            <p className="project-detail__status">Loading sprints...</p>
          )}
          {!sprintsLoading && sprintsError && (
            <Alert variant="error">{sprintsError}</Alert>
          )}
          {!sprintsLoading && !sprintsError && sprints.length === 0 && (
            <p className="project-detail__status">No sprints yet.</p>
          )}

          {!sprintsLoading && !sprintsError && sprints.length > 0 && (
            <div className="sprint-card-grid">
              {sprints.map((sprint) => {
                const timing = getSprintTiming(sprint);
                return (
                  <div key={sprint.id} className="sprint-card">
                    <div className="sprint-card__header">
                      <span className="sprint-card__name">{sprint.name}</span>
                      <span
                        className={`status-badge status-badge--${sprint.status.toLowerCase()}`}
                      >
                        {sprint.status}
                      </span>
                    </div>

                    <div className="sprint-card__dates">
                      <span className="sprint-card__date">
                        {new Date(sprint.startDate).toLocaleDateString()}
                      </span>
                      <span className="sprint-card__date-sep">→</span>
                      <span className="sprint-card__date">
                        {new Date(sprint.endDate).toLocaleDateString()}
                      </span>
                    </div>

                    <span
                      className={`sprint-timing sprint-timing--${timing.tone}`}
                    >
                      {timing.label}
                    </span>

                    {canManageSprints && (
                      <div className="sprint-card__actions">
                        <button
                          type="button"
                          className="sprint-card__edit"
                          onClick={() => openEditSprintModal(sprint)}
                        >
                          Edit
                        </button>
                        {isProjectLead && (
                          <button
                            type="button"
                            className="sprint-card__delete"
                            onClick={() =>
                              setSprintToDelete({
                                id: sprint.id,
                                name: sprint.name,
                              })
                            }
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Modal
          open={sprintModalOpen}
          onClose={closeSprintModal}
          title={editingSprintId ? "Update sprint" : "New sprint"}
        >
          <form className="project-update-form" onSubmit={handleSubmitSprint}>
            <div className="form-field">
              <label htmlFor="sprint-name">Name</label>
              <input
                id="sprint-name"
                type="text"
                value={sprintName}
                onChange={(event) => setSprintName(event.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-field">
              <label htmlFor="sprint-start-date">Start date</label>
              <input
                id="sprint-start-date"
                type="date"
                value={sprintStartDate}
                onChange={(event) => setSprintStartDate(event.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="sprint-end-date">End date</label>
              <input
                id="sprint-end-date"
                type="date"
                value={sprintEndDate}
                onChange={(event) => setSprintEndDate(event.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="sprint-status">Status</label>
              <select
                id="sprint-status"
                value={sprintStatus}
                onChange={(event) =>
                  setSprintStatus(event.target.value as SprintStatus)
                }
              >
                {SPRINT_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {sprintFormError && <Alert variant="error">{sprintFormError}</Alert>}

            <button type="submit" disabled={savingSprint}>
              {savingSprint
                ? "Saving..."
                : editingSprintId
                  ? "Save changes"
                  : "Create sprint"}
            </button>
          </form>
        </Modal>

        <Modal
          open={sprintToDelete !== null}
          onClose={closeDeleteSprintConfirm}
          title="Delete sprint"
        >
          <div className="confirm-modal">
            <p className="confirm-modal__message">
              Delete sprint <strong>{sprintToDelete?.name}</strong>? This
              cannot be undone.
            </p>

            {deleteSprintError && (
              <Alert variant="error">{deleteSprintError}</Alert>
            )}

            <div className="confirm-modal__actions">
              <button
                type="button"
                className="confirm-modal__cancel"
                disabled={deletingSprint}
                onClick={closeDeleteSprintConfirm}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm-modal__confirm"
                disabled={deletingSprint}
                onClick={handleConfirmDeleteSprint}
              >
                {deletingSprint ? "Deleting..." : "Delete sprint"}
              </button>
            </div>
          </div>
        </Modal>

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
