/**
 * Pure helpers for the moderation queue. No React Native imports, so jest
 * can run them in node. The database does the same grouping in
 * public.admin_report_queue() (migration 00025); the mock layer and tests use
 * this file so the web e2e build behaves like the server.
 */

export const AUTO_HIDE_THRESHOLD = 3;
export const REVIEW_SLA_HOURS = 24;
/** How long the Undo button stays on the "Design hidden" note. */
export const UNDO_WINDOW_MS = 5000;

export type ReportStatus = "open" | "dismissed" | "actioned";

export interface RawReport {
  id?: string;
  targetType: string;
  targetId: string;
  userId: string;
  reason: string;
  createdAt: string;
  status?: ReportStatus;
  /** Optional free text from the reporter. Shown to moderators without identity. */
  note?: string | null;
}

export interface DesignInfo {
  id: string;
  user_id?: string | null;
  title?: string | null;
  selected_style?: string | null;
  selected_generation_url?: string | null;
  is_hidden?: boolean;
  is_public?: boolean;
  owner_name?: string | null;
  owner_banned?: boolean;
}

export interface QueueItem {
  projectId: string;
  title: string;
  selectedStyle: string | null;
  thumbnailPath: string | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerBanned: boolean;
  /** How many of the owner's designs are public now (for the ban popup). */
  ownerPublicCount: number;
  isHidden: boolean;
  isPublic: boolean;
  reporterCount: number;
  reportCount: number;
  reasons: string[];
  oldestReportAt: string;
  newestReportAt: string;
  overdue: boolean;
}

/** True when the oldest open report is older than the review window. */
export function isOverdue(oldestReportAt: string, nowMs: number, slaHours = REVIEW_SLA_HOURS): boolean {
  const t = Date.parse(oldestReportAt);
  return Number.isFinite(t) && t < nowMs - slaHours * 3600 * 1000;
}

/** Number of distinct people with an open report on a design. */
export function distinctOpenReporters(reports: RawReport[], designId: string): number {
  return new Set(
    reports
      .filter((r) => r.targetType === "design" && r.targetId === designId && (r.status ?? "open") === "open")
      .map((r) => r.userId)
  ).size;
}

export function shouldAutoHide(reports: RawReport[], designId: string, threshold = AUTO_HIDE_THRESHOLD): boolean {
  return distinctOpenReporters(reports, designId) >= threshold;
}

/**
 * Group open design reports into one queue item per design.
 * Sorted like the SQL: overdue first, then most reporters, then oldest.
 * `nowMs` is passed in so callers (and tests) control time.
 */
export function buildQueue(
  reports: RawReport[],
  designs: DesignInfo[],
  nowMs: number,
  slaHours = REVIEW_SLA_HOURS
): QueueItem[] {
  const byId = new Map(designs.map((d) => [d.id, d]));
  const groups = new Map<string, RawReport[]>();
  for (const r of reports) {
    if (r.targetType !== "design" || (r.status ?? "open") !== "open") continue;
    const list = groups.get(r.targetId) ?? [];
    list.push(r);
    groups.set(r.targetId, list);
  }

  const items: QueueItem[] = [];
  for (const [projectId, list] of groups) {
    const d = byId.get(projectId);
    const times = list.map((r) => r.createdAt).sort();
    items.push({
      projectId,
      title: d?.title || "Untitled design",
      selectedStyle: d?.selected_style ?? null,
      thumbnailPath: d?.selected_generation_url ?? null,
      ownerId: d?.user_id ?? null,
      ownerName: d?.owner_name ?? null,
      ownerBanned: !!d?.owner_banned,
      ownerPublicCount: d?.user_id ? designs.filter((x) => x.user_id === d.user_id && x.is_public).length : 0,
      isHidden: !!d?.is_hidden,
      isPublic: !!d?.is_public,
      reporterCount: new Set(list.map((r) => r.userId)).size,
      reportCount: list.length,
      reasons: Array.from(new Set(list.map((r) => r.reason))).sort(),
      oldestReportAt: times[0],
      newestReportAt: times[times.length - 1],
      overdue: isOverdue(times[0], nowMs, slaHours),
    });
  }

  return items.sort(
    (a, b) =>
      Number(b.overdue) - Number(a.overdue) ||
      b.reporterCount - a.reporterCount ||
      a.oldestReportAt.localeCompare(b.oldestReportAt)
  );
}

const REASON_LABELS: Record<string, string> = {
  inappropriate: "Inappropriate",
  copyright: "Copyright",
  misleading: "Misleading",
  quality: "Poor quality",
  spam: "Spam",
  harmful: "Harmful",
  other: "Other",
};

export function reasonLabel(id: string): string {
  return REASON_LABELS[id] ?? "Other";
}

/** "1 person reported" / "3 people reported" */
export function reporterLabel(n: number): string {
  return n === 1 ? "1 person reported" : `${n} people reported`;
}

/** Report reasons and notes for the detail view. No reporter identity. */
export interface ReportDetail {
  reason: string;
  note: string | null;
  createdAt: string;
}

export function reportDetails(reports: RawReport[], designId: string): ReportDetail[] {
  return reports
    .filter((r) => r.targetType === "design" && r.targetId === designId && (r.status ?? "open") === "open")
    .map((r) => ({ reason: r.reason, note: r.note ?? null, createdAt: r.createdAt }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * "Reported 5m ago", "Reported 3h ago", or "Reported 10/12" once older than a
 * day. `nowMs` is passed in so tests control time.
 */
export function reportedAgo(iso: string, nowMs: number): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "Reported";
  const mins = Math.max(0, Math.floor((nowMs - t) / 60000));
  if (mins < 60) return `Reported ${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Reported ${hours}h ago`;
  const d = new Date(t);
  return `Reported ${d.getMonth() + 1}/${d.getDate()}`;
}

/** "Ban Avery from publishing?" */
export function banTitle(ownerName: string | null): string {
  return ownerName ? `Ban ${ownerName} from publishing?` : "Ban this person from publishing?";
}

/** "3 public designs will go private." */
export function banCountLine(n: number): string {
  if (n <= 0) return "They have no public designs right now.";
  return n === 1 ? "1 public design will go private." : `${n} public designs will go private.`;
}
