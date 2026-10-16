/**
 * The report sheet uses UI names ("design", "message", "contractor"), but the
 * reports table only accepts 'user', 'design' and 'vi_reply' (migration 00014).
 * Without this mapping, reporting a Vi reply failed the check constraint.
 */
export type UiReportType = "design" | "message" | "contractor";
export type DbReportType = "design" | "vi_reply" | "user";

export function toDbReportType(type: UiReportType): DbReportType {
  switch (type) {
    case "message":
      return "vi_reply";
    case "contractor":
      return "user";
    default:
      return "design";
  }
}

/** Reporter note limit. Must match reports_note_length in migration 00025. */
export const REPORT_NOTE_MAX = 200;

/** Trim, cap at REPORT_NOTE_MAX, and turn blank into null. Never throws. */
export function normalizeReportNote(note: string | null | undefined): string | null {
  const t = (note ?? "").replace(/\s+/g, " ").trim().slice(0, REPORT_NOTE_MAX);
  return t.length > 0 ? t : null;
}
