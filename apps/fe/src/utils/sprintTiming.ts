import type { Sprint } from "../types/sprint";

const MS_PER_DAY = 86_400_000;

export interface SprintTiming {
  label: string;
  tone: "upcoming" | "active" | "ended";
}

/**
 * A sprint's `status` alone doesn't tell a reader *when* it sits relative to
 * today - two ACTIVE sprints with different end dates need to read
 * differently. This turns the dates + status into a short, unambiguous
 * "ends in 3 days" / "starts tomorrow" / "ended 2 days ago" label.
 */
export function getSprintTiming(
  sprint: Sprint,
  now: Date = new Date(),
): SprintTiming {
  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);

  if (sprint.status === "CANCELLED") {
    return { label: "Cancelled", tone: "ended" };
  }
  if (sprint.status === "COMPLETED") {
    return { label: "Completed", tone: "ended" };
  }
  if (now < start) {
    const days = Math.ceil((start.getTime() - now.getTime()) / MS_PER_DAY);
    return {
      label: days <= 1 ? "Starts tomorrow" : `Starts in ${days} days`,
      tone: "upcoming",
    };
  }
  if (now > end) {
    const days = Math.floor((now.getTime() - end.getTime()) / MS_PER_DAY);
    return {
      label: days <= 1 ? "Ended yesterday" : `Ended ${days} days ago`,
      tone: "ended",
    };
  }
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / MS_PER_DAY);
  return {
    label: daysLeft <= 1 ? "Ends today" : `${daysLeft} days left`,
    tone: "active",
  };
}
