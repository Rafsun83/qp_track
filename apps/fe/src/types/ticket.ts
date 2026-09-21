export type TicketStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE"
  | "CANCELLED"
  | "HOLD";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Ticket {
  id: string;
  projectId: string;
  sprintId: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  metaData: Record<string, unknown> | null;
  createdBy: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
