import {
  AUTO_HIDE_THRESHOLD,
  REVIEW_SLA_HOURS,
  buildQueue,
  distinctOpenReporters,
  isOverdue,
  reporterLabel,
  shouldAutoHide,
  reportedAgo,
  reportDetails,
  banTitle,
  banCountLine,
  UNDO_WINDOW_MS,
  type RawReport,
} from "../moderation/queue";

// Fixed clock: no wall-clock in these tests.
const NOW = Date.parse("2026-10-13T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3600 * 1000).toISOString();

const r = (targetId: string, userId: string, h: number, extra: Partial<RawReport> = {}): RawReport => ({
  targetType: "design",
  targetId,
  userId,
  reason: "spam",
  createdAt: hoursAgo(h),
  ...extra,
});

describe("moderation queue", () => {
  it("keeps the agreed thresholds", () => {
    expect(AUTO_HIDE_THRESHOLD).toBe(3);
    expect(REVIEW_SLA_HOURS).toBe(24);
  });

  it("counts distinct open reporters only", () => {
    const reports = [r("d1", "a", 1), r("d1", "a", 2), r("d1", "b", 1), r("d1", "c", 1, { status: "dismissed" })];
    expect(distinctOpenReporters(reports, "d1")).toBe(2);
    expect(shouldAutoHide(reports, "d1")).toBe(false);
    expect(shouldAutoHide([...reports, r("d1", "d", 1)], "d1")).toBe(true);
  });

  it("flags reports older than 24 hours", () => {
    expect(isOverdue(hoursAgo(25), NOW)).toBe(true);
    expect(isOverdue(hoursAgo(23), NOW)).toBe(false);
  });

  it("groups by design, sorts overdue first, ignores resolved and non-design reports", () => {
    const q = buildQueue(
      [
        r("d1", "a", 2), r("d1", "b", 3), r("d1", "c", 1, { reason: "copyright" }),
        r("d2", "a", 30),
        r("d3", "a", 1, { status: "actioned" }),
        { ...r("u1", "a", 1), targetType: "user" },
      ],
      [{ id: "d1", title: "Loft", user_id: "o1", is_hidden: true }, { id: "d2", title: "Den" }],
      NOW
    );
    expect(q.map((i) => i.projectId)).toEqual(["d2", "d1"]);
    expect(q[0]).toMatchObject({ overdue: true, reporterCount: 1, title: "Den" });
    expect(q[1]).toMatchObject({ overdue: false, reporterCount: 3, reportCount: 3, isHidden: true, reasons: ["copyright", "spam"] });
  });

  it("labels reporter counts", () => {
    expect(reporterLabel(1)).toBe("1 person reported");
    expect(reporterLabel(3)).toBe("3 people reported");
  });
});

import { REPORT_NOTE_MAX, normalizeReportNote, toDbReportType } from "../moderation/report-target";

describe("report target mapping", () => {
  it("maps UI report types to the values the reports table accepts", () => {
    expect(toDbReportType("design")).toBe("design");
    expect(toDbReportType("message")).toBe("vi_reply");
    expect(toDbReportType("contractor")).toBe("user");
  });
});

describe("moderation copy helpers", () => {
  it("keeps the undo window at 5 seconds", () => {
    expect(UNDO_WINDOW_MS).toBe(5000);
  });

  it("formats report age as minutes, hours, then month/day", () => {
    expect(reportedAgo(new Date(NOW - 20 * 1000).toISOString(), NOW)).toBe("Reported 1m ago");
    expect(reportedAgo(new Date(NOW - 45 * 60000).toISOString(), NOW)).toBe("Reported 45m ago");
    expect(reportedAgo(hoursAgo(3), NOW)).toBe("Reported 3h ago");
    const old = new Date(NOW - 30 * 3600 * 1000);
    expect(reportedAgo(old.toISOString(), NOW)).toBe(`Reported ${old.getMonth() + 1}/${old.getDate()}`);
  });

  it("builds the ban popup copy with the real name and count", () => {
    expect(banTitle("Avery")).toBe("Ban Avery from publishing?");
    expect(banTitle(null)).toBe("Ban this person from publishing?");
    expect(banCountLine(1)).toBe("1 public design will go private.");
    expect(banCountLine(3)).toBe("3 public designs will go private.");
  });

  it("returns reasons and notes without reporter identity", () => {
    const d = reportDetails([r("d1", "secret-user", 1, { note: "Logo" }), r("d1", "b", 2), r("d1", "c", 3, { status: "dismissed" })], "d1");
    expect(d).toEqual([
      { reason: "spam", note: "Logo", createdAt: hoursAgo(1) },
      { reason: "spam", note: null, createdAt: hoursAgo(2) },
    ]);
    expect(JSON.stringify(d)).not.toContain("secret-user");
  });

  it("counts the owner's public designs for the ban popup", () => {
    const q = buildQueue([r("d1", "a", 1)], [
      { id: "d1", user_id: "o", is_public: true },
      { id: "d2", user_id: "o", is_public: true },
      { id: "d3", user_id: "o", is_public: false },
      { id: "d4", user_id: "x", is_public: true },
    ], NOW);
    expect(q[0].ownerPublicCount).toBe(2);
  });
});

describe("report note", () => {
  it("is optional, trimmed and capped at 200", () => {
    expect(REPORT_NOTE_MAX).toBe(200);
    expect(normalizeReportNote(undefined)).toBeNull();
    expect(normalizeReportNote("   ")).toBeNull();
    expect(normalizeReportNote("  a  b ")).toBe("a b");
    expect(normalizeReportNote("x".repeat(250))).toHaveLength(200);
  });

  it("matches the database limit", () => {
    const sql = require("fs").readFileSync(require("path").join(__dirname, "../../supabase/migrations/00025_admin_moderation.sql"), "utf8");
    expect(sql).toContain(`char_length(note) <= ${REPORT_NOTE_MAX}`);
  });
});
