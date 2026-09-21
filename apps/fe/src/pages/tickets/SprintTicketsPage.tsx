import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { getProjectById } from "../../api/projects";
import { getSprintById } from "../../api/sprints";
import {
  createTicket,
  deleteTicket,
  getTicketsForSprint,
  updateTicket,
} from "../../api/tickets";
import { getUserById } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import { Alert } from "../../components/ui/Alert";
import { Modal } from "../../components/ui/Modal";
import type { Project } from "../../types/project";
import type { Sprint } from "../../types/sprint";
import type { Ticket, TicketPriority, TicketStatus } from "../../types/ticket";
import type { User } from "../../types/user";
import { getSprintTiming } from "../../utils/sprintTiming";
import "./SprintTicketsPage.css";

const STATUS_OPTIONS: TicketStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
  "HOLD",
];
const PRIORITY_OPTIONS: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

/** "IN_PROGRESS" -> "In Progress" */
function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((word) => word[0] + word.slice(1).toLowerCase())
    .join(" ");
}

export function SprintTicketsPage() {
  const { organizationId, projectId, sprintId } = useParams<{
    organizationId: string;
    projectId: string;
    sprintId: string;
  }>();
  const { token, userId } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  // Ticket rows only carry ids for who created/is assigned to them - resolved
  // to display names with individual lookups, same pattern as project members.
  const [users, setUsers] = useState<Record<string, User>>({});

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TicketStatus>("TODO");
  const [priority, setPriority] = useState<TicketPriority>("LOW");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [quickUpdateError, setQuickUpdateError] = useState<string | null>(
    null,
  );

  const [ticketToDelete, setTicketToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [deleteTicketError, setDeleteTicketError] = useState<string | null>(
    null,
  );

  const loadContext = useCallback(() => {
    if (!token || !organizationId || !projectId || !sprintId) return;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      getProjectById(token, organizationId, projectId),
      getSprintById(token, projectId, sprintId),
    ])
      .then(([proj, spr]) => {
        setProject(proj);
        setSprint(spr);
      })
      .catch((err) =>
        setLoadError(
          err instanceof Error ? err.message : "Failed to load sprint.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token, organizationId, projectId, sprintId]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const loadTickets = useCallback(() => {
    if (!token || !projectId || !sprintId) return;
    setTicketsLoading(true);
    setTicketsError(null);
    getTicketsForSprint(token, projectId, sprintId)
      .then(setTickets)
      .catch((err) =>
        setTicketsError(
          err instanceof Error ? err.message : "Failed to load tickets.",
        ),
      )
      .finally(() => setTicketsLoading(false));
  }, [token, projectId, sprintId]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Resolve display names for any creator/assignee ids we don't have cached yet.
  useEffect(() => {
    if (!token) return;
    const ids = new Set<string>();
    tickets.forEach((ticket) => {
      ids.add(ticket.createdBy);
      if (ticket.assigneeId) ids.add(ticket.assigneeId);
    });
    const missing = [...ids].filter((id) => !(id in users));
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(missing.map((id) => getUserById(token, id)))
      .then((results) => {
        if (cancelled) return;
        setUsers((prev) => {
          const next = { ...prev };
          results.forEach((user) => {
            next[user.id] = user;
          });
          return next;
        });
      })
      .catch(() => {
        // Best-effort - fall back to showing the raw id if a lookup fails.
      });

    return () => {
      cancelled = true;
    };
  }, [token, tickets, users]);

  const projectMembership = project?.members?.find(
    (member) => member.userId === userId,
  );
  // Matches the backend: LEAD or CONTRIBUTOR can create/update/delete
  // tickets, VIEWER is read-only.
  const canManageTickets =
    projectMembership?.role === "LEAD" ||
    projectMembership?.role === "CONTRIBUTOR";

  function nameFor(id: string | null): string {
    if (!id) return "Unassigned";
    return users[id]?.name ?? id;
  }

  function openCreateModal() {
    setEditingTicketId(null);
    setTitle("");
    setDescription("");
    setStatus("TODO");
    setPriority("LOW");
    setFormError(null);
    setFormModalOpen(true);
  }

  function openEditModal(ticket: Ticket) {
    setEditingTicketId(ticket.id);
    setTitle(ticket.title);
    setDescription(ticket.description);
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setFormError(null);
    setFormModalOpen(true);
  }

  function closeFormModal() {
    setFormModalOpen(false);
    setFormError(null);
  }

  async function handleSubmitTicket(event: FormEvent) {
    event.preventDefault();
    if (!token || !projectId || !sprintId) return;

    setFormError(null);
    setSaving(true);
    try {
      const payload = { title, description, status, priority };
      if (editingTicketId) {
        await updateTicket(token, projectId, sprintId, editingTicketId, payload);
      } else {
        await createTicket(token, projectId, sprintId, payload);
      }
      setFormModalOpen(false);
      loadTickets();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Failed to save ticket.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickUpdate(
    ticket: Ticket,
    patch: Partial<Pick<Ticket, "status" | "priority">>,
  ) {
    if (!token || !projectId || !sprintId) return;

    setQuickUpdateError(null);
    setBusyTicketId(ticket.id);
    try {
      const updated = await updateTicket(
        token,
        projectId,
        sprintId,
        ticket.id,
        patch,
      );
      setTickets((prev) =>
        prev.map((item) => (item.id === ticket.id ? updated : item)),
      );
    } catch (err) {
      setQuickUpdateError(
        err instanceof ApiError ? err.message : "Failed to update ticket.",
      );
    } finally {
      setBusyTicketId(null);
    }
  }

  function closeDeleteConfirm() {
    setTicketToDelete(null);
    setDeleteTicketError(null);
  }

  async function handleConfirmDeleteTicket() {
    if (!token || !projectId || !sprintId || !ticketToDelete) return;

    setDeleteTicketError(null);
    setDeletingTicket(true);
    try {
      await deleteTicket(token, projectId, sprintId, ticketToDelete.id);
      setTicketToDelete(null);
      loadTickets();
    } catch (err) {
      setDeleteTicketError(
        err instanceof ApiError ? err.message : "Failed to delete ticket.",
      );
    } finally {
      setDeletingTicket(false);
    }
  }

  if (loading)
    return <p className="sprint-tickets__status">Loading sprint...</p>;
  if (loadError) return <Alert variant="error">{loadError}</Alert>;
  if (!project || !sprint)
    return <p className="sprint-tickets__status">Sprint not found.</p>;

  const timing = getSprintTiming(sprint);
  const editingTicket = editingTicketId
    ? tickets.find((ticket) => ticket.id === editingTicketId) ?? null
    : null;

  return (
    <div className="sprint-tickets">
      <Link
        to={`/organizations/${organizationId}/projects/${projectId}`}
        className="sprint-tickets__back"
      >
        ← {project.name}
      </Link>

      <div className="sprint-tickets__header">
        <div>
          <h1 className="sprint-tickets__title">{sprint.name}</h1>
          <p className="sprint-tickets__meta">
            {new Date(sprint.startDate).toLocaleDateString()} →{" "}
            {new Date(sprint.endDate).toLocaleDateString()}
            {" · "}
            <span
              className={`status-badge status-badge--${sprint.status.toLowerCase()}`}
            >
              {sprint.status}
            </span>{" "}
            <span className={`sprint-timing sprint-timing--${timing.tone}`}>
              {timing.label}
            </span>
          </p>
        </div>

        {canManageTickets && (
          <button
            type="button"
            className="project-detail__action-btn"
            onClick={openCreateModal}
          >
            New ticket
          </button>
        )}
      </div>

      {quickUpdateError && <Alert variant="error">{quickUpdateError}</Alert>}

      {ticketsLoading && (
        <p className="sprint-tickets__status">Loading tickets...</p>
      )}
      {!ticketsLoading && ticketsError && (
        <Alert variant="error">{ticketsError}</Alert>
      )}
      {!ticketsLoading && !ticketsError && tickets.length === 0 && (
        <p className="sprint-tickets__status">No tickets in this sprint yet.</p>
      )}

      {!ticketsLoading && !ticketsError && tickets.length > 0 && (
        <div className="ticket-card-grid">
          {tickets.map((ticket) => {
            const isBusy = busyTicketId === ticket.id;
            return (
              <div
                key={ticket.id}
                className="ticket-card"
                role="button"
                tabIndex={0}
                onClick={() => openEditModal(ticket)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openEditModal(ticket);
                  }
                }}
              >
                <div className="ticket-card__top">
                  <h3 className="ticket-card__title">{ticket.title}</h3>
                  {canManageTickets && (
                    <button
                      type="button"
                      className="ticket-card__delete"
                      aria-label="Delete ticket"
                      onClick={(event) => {
                        event.stopPropagation();
                        setTicketToDelete({
                          id: ticket.id,
                          title: ticket.title,
                        });
                      }}
                    >
                      &times;
                    </button>
                  )}
                </div>

                <p className="ticket-card__description">
                  {ticket.description}
                </p>

                <div
                  className="ticket-card__controls"
                  onClick={(event) => event.stopPropagation()}
                >
                  <select
                    className={`ticket-select ticket-select--status ticket-select--status-${ticket.status.toLowerCase()}`}
                    value={ticket.status}
                    disabled={!canManageTickets || isBusy}
                    onChange={(event) =>
                      handleQuickUpdate(ticket, {
                        status: event.target.value as TicketStatus,
                      })
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatEnumLabel(option)}
                      </option>
                    ))}
                  </select>

                  <select
                    className={`ticket-select ticket-select--priority ticket-select--priority-${ticket.priority.toLowerCase()}`}
                    value={ticket.priority}
                    disabled={!canManageTickets || isBusy}
                    onChange={(event) =>
                      handleQuickUpdate(ticket, {
                        priority: event.target.value as TicketPriority,
                      })
                    }
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatEnumLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-card__footer">
                  <span className="ticket-card__assignee">
                    {nameFor(ticket.assigneeId)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={formModalOpen}
        onClose={closeFormModal}
        title={editingTicketId ? "Ticket details" : "New ticket"}
      >
        <form className="project-update-form" onSubmit={handleSubmitTicket}>
          <div className="form-field">
            <label htmlFor="ticket-title">Title</label>
            <input
              id="ticket-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-field">
            <label htmlFor="ticket-description">Description</label>
            <textarea
              id="ticket-description"
              className="ticket-form__textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              rows={4}
            />
          </div>

          <div className="ticket-form__row">
            <div className="form-field">
              <label htmlFor="ticket-status">Status</label>
              <select
                id="ticket-status"
                className={`ticket-select ticket-select--status-${status.toLowerCase()}`}
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as TicketStatus)
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatEnumLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="ticket-priority">Priority</label>
              <select
                id="ticket-priority"
                className={`ticket-select ticket-select--priority-${priority.toLowerCase()}`}
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as TicketPriority)
                }
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatEnumLabel(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {editingTicket && (
            <p className="ticket-form__meta">
              Created by {nameFor(editingTicket.createdBy)} · Assigned to{" "}
              {nameFor(editingTicket.assigneeId)} ·{" "}
              {new Date(editingTicket.createdAt).toLocaleString()}
            </p>
          )}

          {formError && <Alert variant="error">{formError}</Alert>}

          <div className="project-update-form__actions">
            <button type="submit" disabled={saving || !canManageTickets}>
              {saving
                ? "Saving..."
                : editingTicketId
                  ? "Save changes"
                  : "Create ticket"}
            </button>

            {editingTicketId && canManageTickets && (
              <button
                type="button"
                className="project-update-form__delete"
                onClick={() => {
                  setFormModalOpen(false);
                  setTicketToDelete({
                    id: editingTicketId,
                    title,
                  });
                }}
              >
                Delete ticket
              </button>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        open={ticketToDelete !== null}
        onClose={closeDeleteConfirm}
        title="Delete ticket"
      >
        <div className="confirm-modal">
          <p className="confirm-modal__message">
            Delete ticket <strong>{ticketToDelete?.title}</strong>? This
            cannot be undone.
          </p>

          {deleteTicketError && (
            <Alert variant="error">{deleteTicketError}</Alert>
          )}

          <div className="confirm-modal__actions">
            <button
              type="button"
              className="confirm-modal__cancel"
              disabled={deletingTicket}
              onClick={closeDeleteConfirm}
            >
              Cancel
            </button>
            <button
              type="button"
              className="confirm-modal__confirm"
              disabled={deletingTicket}
              onClick={handleConfirmDeleteTicket}
            >
              {deletingTicket ? "Deleting..." : "Delete ticket"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
