import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../supabase";
import { buildQueue, reportDetails, shouldAutoHide, type DesignInfo, type QueueItem, type RawReport, type ReportDetail } from "./queue";

export * from "./queue";

/**
 * Moderation data layer (admin side of Report/Block, App Review 1.2).
 *
 * Real mode calls the admin RPCs from migration 00025; the database refuses
 * every one of them unless public.is_admin() is true, so hiding the screen is
 * only a convenience, not the security boundary.
 *
 * Mock mode (EXPO_PUBLIC_DEV_MOCK_SESSION, web e2e only) reads the same
 * AsyncStorage keys the mock report flow writes, and applies the same rules.
 */

const isMock = () => __DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true";

export const MOCK_KEYS = {
  isAdmin: "@visionbuild:mock_is_admin",
  reports: "@visionbuild:reports",
  projects: "@visionbuild:mock_seed_projects",
  log: "@visionbuild:mock_moderation_log",
  banned: "@visionbuild:mock_banned_users",
} as const;

export type ModerationAction =
  | "hide_design"
  | "dismiss_report"
  | "ban_user"
  | "auto_hide_design"
  | "keep_hidden"
  | "restore_design";

export interface LogEntry {
  id: string;
  action: ModerationAction;
  targetType: string;
  targetId: string;
  createdAt: string;
  byAdmin: boolean;
  details?: Record<string, unknown>;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

let mockSeq = 0;
async function mockLog(
  action: ModerationAction,
  targetType: string,
  targetId: string,
  byAdmin: boolean,
  details?: Record<string, unknown>,
  createdAt = new Date().toISOString()
) {
  const log = await readJson<LogEntry[]>(MOCK_KEYS.log, []);
  log.unshift({
    id: `log-${log.length + 1}-${++mockSeq}`,
    action,
    targetType,
    targetId,
    createdAt,
    byAdmin,
    details,
  });
  await writeJson(MOCK_KEYS.log, log);
}

export async function checkIsAdmin(): Promise<boolean> {
  if (isMock()) {
    return (await AsyncStorage.getItem(MOCK_KEYS.isAdmin)) === "true";
  }
  const { data, error } = await (supabase.rpc as any)("is_admin");
  return !error && data === true;
}

export async function fetchQueue(): Promise<QueueItem[]> {
  if (isMock()) {
    const reports = await readJson<RawReport[]>(MOCK_KEYS.reports, []);
    const projects = await readJson<DesignInfo[]>(MOCK_KEYS.projects, []);
    const banned = await readJson<string[]>(MOCK_KEYS.banned, []);
    const designs = projects.map((p) => ({ ...p, owner_banned: banned.includes(p.user_id || "") }));
    return buildQueue(reports, designs, Date.now());
  }
  const { data, error } = await (supabase.rpc as any)("admin_report_queue");
  if (error) throw error;
  return (data || []).map((row: any): QueueItem => ({
    projectId: row.project_id ?? row.target_id,
    title: row.title || "Untitled design",
    selectedStyle: row.selected_style ?? null,
    thumbnailPath: row.thumbnail_path ?? null,
    ownerId: row.owner_id ?? null,
    ownerName: row.owner_name ?? null,
    ownerBanned: !!row.owner_banned,
    ownerPublicCount: Number(row.owner_public_count) || 0,
    isHidden: !!row.is_hidden,
    isPublic: !!row.is_public,
    reporterCount: Number(row.reporter_count) || 0,
    reportCount: Number(row.report_count) || 0,
    reasons: row.reasons || [],
    oldestReportAt: row.oldest_report_at,
    newestReportAt: row.newest_report_at,
    overdue: !!row.overdue,
  }));
}

export async function fetchLog(limit = 10): Promise<LogEntry[]> {
  if (isMock()) {
    return (await readJson<LogEntry[]>(MOCK_KEYS.log, [])).slice(0, limit);
  }
  const { data, error } = await (supabase.from("moderation_log") as any)
    .select("id, action, target_type, target_id, created_at, admin_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    createdAt: r.created_at,
    byAdmin: !!r.admin_id,
  }));
}

type MockReport = RawReport & { resolvedAt?: string | null };

async function mockResolve(
  match: (r: RawReport) => boolean,
  status: "dismissed" | "actioned",
  resolvedAt = new Date().toISOString()
) {
  const reports = await readJson<MockReport[]>(MOCK_KEYS.reports, []);
  await writeJson(
    MOCK_KEYS.reports,
    reports.map((r) => ((r.status ?? "open") === "open" && match(r) ? { ...r, status, resolvedAt } : r))
  );
}

async function mockUpdateProjects(match: (p: DesignInfo) => boolean, patch: Partial<DesignInfo>) {
  const projects = await readJson<DesignInfo[]>(MOCK_KEYS.projects, []);
  await writeJson(MOCK_KEYS.projects, projects.map((p) => (match(p) ? { ...p, ...patch } : p)));
}

export async function hideDesign(projectId: string): Promise<void> {
  if (isMock()) {
    if (!(await checkIsAdmin())) throw new Error("admin only");
    const projects = await readJson<DesignInfo[]>(MOCK_KEYS.projects, []);
    const wasPublic = !!projects.find((p) => p.id === projectId)?.is_public;
    const stamp = new Date().toISOString();
    await mockUpdateProjects((p) => p.id === projectId, { is_hidden: true, is_public: false });
    await mockResolve((r) => r.targetType === "design" && r.targetId === projectId, "actioned", stamp);
    await mockLog("hide_design", "design", projectId, true, { was_public: wasPublic }, stamp);
    return;
  }
  const { error } = await (supabase.rpc as any)("admin_hide_design", { p_project_id: projectId });
  if (error) throw error;
}

export async function dismissReports(projectId: string): Promise<void> {
  if (isMock()) {
    if (!(await checkIsAdmin())) throw new Error("admin only");
    const log = await readJson<LogEntry[]>(MOCK_KEYS.log, []);
    const autoOnly =
      log.some((l) => l.targetId === projectId && l.action === "auto_hide_design") &&
      !log.some((l) => l.targetId === projectId && l.action === "hide_design");
    await mockResolve((r) => r.targetType === "design" && r.targetId === projectId, "dismissed");
    if (autoOnly) await mockUpdateProjects((p) => p.id === projectId, { is_hidden: false });
    await mockLog("dismiss_report", "design", projectId, true);
    return;
  }
  const { error } = await (supabase.rpc as any)("admin_dismiss_reports", { p_project_id: projectId });
  if (error) throw error;
}

/** Auto-hidden design reviewed: keep it hidden and close its reports. */
export async function keepHidden(projectId: string): Promise<void> {
  if (isMock()) {
    if (!(await checkIsAdmin())) throw new Error("admin only");
    await mockResolve((r) => r.targetType === "design" && r.targetId === projectId, "actioned");
    await mockLog("keep_hidden", "design", projectId, true);
    return;
  }
  const { error } = await (supabase.rpc as any)("admin_keep_hidden", { p_project_id: projectId });
  if (error) throw error;
}

/**
 * Unhide a design. `undo: true` is the Undo right after Hide: it also puts the
 * reports that Hide closed back in the queue. Otherwise open reports are
 * dismissed. Republishes only if it was public before the last Hide.
 */
export async function restoreDesign(projectId: string, opts: { undo?: boolean } = {}): Promise<void> {
  const undo = !!opts.undo;
  if (isMock()) {
    if (!(await checkIsAdmin())) throw new Error("admin only");
    const log = await readJson<LogEntry[]>(MOCK_KEYS.log, []);
    const lastHide = log.find((l) => l.targetId === projectId && l.action === "hide_design");
    const banned = await readJson<string[]>(MOCK_KEYS.banned, []);
    const projects = await readJson<DesignInfo[]>(MOCK_KEYS.projects, []);
    const owner = projects.find((p) => p.id === projectId)?.user_id || "";
    const republish = !!lastHide?.details?.was_public && !banned.includes(owner);
    await mockUpdateProjects((p) => p.id === projectId, republish ? { is_hidden: false, is_public: true } : { is_hidden: false });
    const reports = await readJson<MockReport[]>(MOCK_KEYS.reports, []);
    if (undo && lastHide) {
      await writeJson(
        MOCK_KEYS.reports,
        reports.map((r) =>
          r.targetType === "design" && r.targetId === projectId && r.status === "actioned" && r.resolvedAt === lastHide.createdAt
            ? { ...r, status: undefined, resolvedAt: null }
            : r
        )
      );
    } else {
      await mockResolve((r) => r.targetType === "design" && r.targetId === projectId, "dismissed");
    }
    await mockLog("restore_design", "design", projectId, true, { undo, republished: republish });
    return;
  }
  const { error } = await (supabase.rpc as any)("admin_restore_design", { p_project_id: projectId, p_reopen: undo });
  if (error) throw error;
}

/** Reasons and reporter notes for one design (never who reported). */
export async function fetchReportDetails(projectId: string): Promise<ReportDetail[]> {
  if (isMock()) {
    if (!(await checkIsAdmin())) throw new Error("admin only");
    return reportDetails(await readJson<RawReport[]>(MOCK_KEYS.reports, []), projectId);
  }
  const { data, error } = await (supabase.rpc as any)("admin_report_details", { p_project_id: projectId });
  if (error) throw error;
  return (data || []).map((r: any) => ({ reason: r.reason, note: r.note ?? null, createdAt: r.created_at }));
}

/** One queue item (for the detail view). */
export async function fetchQueueItem(projectId: string): Promise<QueueItem | null> {
  return (await fetchQueue()).find((q) => q.projectId === projectId) ?? null;
}

export async function banUser(userId: string): Promise<void> {
  if (isMock()) {
    if (!(await checkIsAdmin())) throw new Error("admin only");
    const banned = await readJson<string[]>(MOCK_KEYS.banned, []);
    if (!banned.includes(userId)) await writeJson(MOCK_KEYS.banned, [...banned, userId]);
    const projects = await readJson<DesignInfo[]>(MOCK_KEYS.projects, []);
    const owned = new Set(projects.filter((p) => p.user_id === userId).map((p) => p.id));
    await mockUpdateProjects((p) => p.user_id === userId, { is_public: false });
    await mockResolve(
      (r) => (r.targetType === "design" && owned.has(r.targetId)) || (r.targetType === "user" && r.targetId === userId),
      "actioned"
    );
    await mockLog("ban_user", "user", userId, true);
    return;
  }
  const { error } = await (supabase.rpc as any)("admin_ban_user", { p_user_id: userId });
  if (error) throw error;
}

/**
 * Mock-mode mirror of the reports_auto_hide trigger: once a design has
 * AUTO_HIDE_THRESHOLD distinct open reporters, hide it pending review.
 */
export async function mockApplyAutoHide(designId: string): Promise<void> {
  if (!isMock()) return;
  const reports = await readJson<RawReport[]>(MOCK_KEYS.reports, []);
  if (!shouldAutoHide(reports, designId)) return;
  const projects = await readJson<DesignInfo[]>(MOCK_KEYS.projects, []);
  const p = projects.find((x) => x.id === designId);
  if (!p || p.is_hidden) return;
  await mockUpdateProjects((x) => x.id === designId, { is_hidden: true });
  await mockLog("auto_hide_design", "design", designId, false);
}

/** Signed URL for a reported design (admin-design-image edge function). */
export async function fetchDesignImageUrl(projectId: string): Promise<string | null> {
  if (isMock()) return null;
  const { data, error } = await supabase.functions.invoke("admin-design-image", { body: { projectId } });
  if (error) return null;
  return (data as { url?: string | null })?.url ?? null;
}

export async function mockBannedUsers(): Promise<string[]> {
  return isMock() ? readJson<string[]>(MOCK_KEYS.banned, []) : [];
}
