export type SprintStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
}
