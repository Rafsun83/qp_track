import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import {
  addOrganizationMember,
  getOrganizationById,
  leaveOrganizationMember,
  removeOrganizationMember,
} from "../../api/organizations";
import { createProject, getProjectsInOrganization } from "../../api/projects";
import { searchUsersByUserName } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import { Alert } from "../../components/ui/Alert";
import type {
  Organization,
  OrganizationMember,
  OrganizationRole,
} from "../../types/organization";
import type { Project } from "../../types/project";
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

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<
    string | null
  >(null);

  const loadOrganization = useCallback(() => {
    if (!token || !id) return;
    setLoading(true);
    setLoadError(null);
    getOrganizationById(token, id)
      .then(setOrganization)
      .catch((err) =>
        setLoadError(
          err instanceof Error ? err.message : "Failed to load organization.",
        ),
      )
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

  const currentMembership = organization?.members?.find(
    (member) => member.userId === userId,
  );
  const isOwner = currentMembership?.role === "OWNER";
  const isAdmin = currentMembership?.role === "ADMIN";

  // Listing an organization's projects requires the OWNER role in the backend, so
  // there's no point calling it (or showing the section) for anyone else.
  const loadProjects = useCallback(() => {
    if (!token || !id || !isOwner) return;
    setProjectsLoading(true);
    setProjectsError(null);
    getProjectsInOrganization(token, id)
      .then(setProjects)
      .catch((err) =>
        setProjectsError(
          err instanceof Error ? err.message : "Failed to load projects.",
        ),
      )
      .finally(() => setProjectsLoading(false));
  }, [token, id, isOwner]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  async function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    if (!token || !id) return;

    setCreateProjectError(null);
    setCreatingProject(true);
    try {
      await createProject(token, id, {
        name: projectName,
        description: projectDescription,
        key: projectKey,
      });
      setProjectName("");
      setProjectKey("");
      setProjectDescription("");
      loadProjects();
    } catch (err) {
      setCreateProjectError(
        err instanceof ApiError ? err.message : "Failed to create project.",
      );
    } finally {
      setCreatingProject(false);
    }
  }

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
      setAddError(
        err instanceof ApiError ? err.message : "Failed to add member.",
      );
    } finally {
      setAdding(false);
    }
  }

  // Only an OWNER may call the plain delete route; everyone else who's
  // allowed to remove/leave goes through the leave route instead.
  async function handleMemberAction(memberUserId: string, useDeleteApi: boolean) {
    if (!token || !id) return;

    setRemoveError(null);
    setRemovingUserId(memberUserId);
    try {
      if (useDeleteApi) {
        await removeOrganizationMember(token, id, memberUserId);
      } else {
        await leaveOrganizationMember(token, id, memberUserId);
      }
      loadOrganization();
    } catch (err) {
      setRemoveError(
        err instanceof ApiError ? err.message : "Failed to remove member.",
      );
    } finally {
      setRemovingUserId(null);
    }
  }

  function getMemberAction(
    member: OrganizationMember,
  ): { label: string; useDeleteApi: boolean } | null {
    const isSelf = member.userId === userId;

    if (isOwner) {
      // Owner can remove anyone but himself (backend rejects self-delete on this route).
      return isSelf ? null : { label: "Remove", useDeleteApi: true };
    }

    if (isAdmin) {
      if (member.role === "OWNER") return null;
      return isSelf
        ? { label: "Leave", useDeleteApi: false }
        : { label: "Remove", useDeleteApi: false };
    }

    // Plain member: can only leave, not touch anyone else.
    return isSelf ? { label: "Leave", useDeleteApi: false } : null;
  }

  if (loading)
    return <p className="org-detail__status">Loading organization...</p>;
  if (loadError) return <Alert variant="error">{loadError}</Alert>;
  if (!organization)
    return <p className="org-detail__status">Organization not found.</p>;

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
                onChange={(event) =>
                  setRole(event.target.value as OrganizationRole)
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
        )}

        {isOwner && (
          <div className="org-projects">
            <h2 className="org-projects__title">Projects</h2>

            <form className="org-create-project-form" onSubmit={handleCreateProject}>
              <div className="form-field">
                <label htmlFor="project-name">Name</label>
                <input
                  id="project-name"
                  type="text"
                  placeholder="Project name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="project-key">Key</label>
                <input
                  id="project-key"
                  type="text"
                  placeholder="e.g. WEB"
                  value={projectKey}
                  onChange={(event) => setProjectKey(event.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="project-description">Description</label>
                <input
                  id="project-description"
                  type="text"
                  placeholder="What is this project about?"
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  required
                />
              </div>

              {createProjectError && (
                <Alert variant="error">{createProjectError}</Alert>
              )}

              <button type="submit" disabled={creatingProject}>
                {creatingProject ? "Creating..." : "Create project"}
              </button>
            </form>

            {projectsLoading && (
              <p className="org-detail__status">Loading projects...</p>
            )}
            {!projectsLoading && projectsError && (
              <Alert variant="error">{projectsError}</Alert>
            )}
            {!projectsLoading && !projectsError && projects.length === 0 && (
              <p className="org-detail__status">No projects yet.</p>
            )}

            {!projectsLoading && !projectsError && projects.length > 0 && (
              <div className="project-card-grid">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/organizations/${organization.id}/projects/${project.id}`}
                    className="project-card"
                  >
                    <div className="project-card__header">
                      <span className="project-card__name">{project.name}</span>
                      <span className="project-card__key">{project.key}</span>
                    </div>
                    <p className="project-card__description">
                      {project.description}
                    </p>
                    <div className="project-card__footer">
                      <span
                        className={`project-card__status project-card__status--${project.status.toLowerCase()}`}
                      >
                        {project.status}
                      </span>
                      <span className="project-card__meta">
                        {project.members?.length ?? 0} member(s)
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="org-detail__members">
        <h2 className="org-detail__members-title">Members</h2>
        {removeError && <Alert variant="error">{removeError}</Alert>}
        <ul className="org-member-list">
          {organization.members?.map((member) => {
            const action = getMemberAction(member);
            const isBusy = removingUserId === member.userId;
            return (
              <li key={member.id} className="org-member-list__item">
                <div>
                  <div className="org-member-list__name">
                    {member.user?.name ?? member.userId}
                  </div>
                  <div className="org-member-list__role">{member.role}</div>
                </div>
                {action && (
                  <button
                    type="button"
                    className="org-member-list__remove"
                    disabled={isBusy}
                    onClick={() =>
                      handleMemberAction(member.userId, action.useDeleteApi)
                    }
                  >
                    {isBusy
                      ? action.label === "Leave"
                        ? "Leaving..."
                        : "Removing..."
                      : action.label}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
