import { banUser, dismissReports, hideDesign, keepHidden, restoreDesign } from "./index";

export type CardAction = "hide" | "dismiss" | "keep" | "restore" | "ban";
export type AnyAction = CardAction | "undo";

export const DONE_TEXT: Record<AnyAction, string> = {
  hide: "Design hidden",
  dismiss: "Reports dismissed",
  keep: "Kept hidden",
  restore: "Design restored",
  ban: "Owner banned from publishing",
  undo: "Hide undone",
};

/** Runs one moderation action. The database enforces admin and logs it. */
export async function runModerationAction(
  kind: AnyAction,
  target: { projectId: string; ownerId: string | null }
): Promise<void> {
  if (kind === "hide") return hideDesign(target.projectId);
  if (kind === "dismiss") return dismissReports(target.projectId);
  if (kind === "keep") return keepHidden(target.projectId);
  if (kind === "restore") return restoreDesign(target.projectId);
  if (kind === "undo") return restoreDesign(target.projectId, { undo: true });
  if (kind === "ban") {
    if (!target.ownerId) throw new Error("no owner");
    return banUser(target.ownerId);
  }
}

/**
 * Hand-off from the detail screen back to the queue: the detail screen acts,
 * leaves a pending notice here, and goes back; the queue picks it up on focus
 * and shows the same confirmation (with Undo after a Hide).
 */
export interface PendingNotice {
  kind: AnyAction;
  projectId: string;
}

let pending: PendingNotice | null = null;

export function setPendingNotice(n: PendingNotice) {
  pending = n;
}

export function takePendingNotice(): PendingNotice | null {
  const n = pending;
  pending = null;
  return n;
}
