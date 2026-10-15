/**
 * Generating progress, from real signals only.
 *
 * The bar has 4 segments, one per design. A segment is "done" only once that
 * design really exists (the project is generated and has its image). The next
 * one is "active". While a design is in flight there's no real per-design
 * percentage, so the active segment gets an indeterminate shimmer (or a steady
 * highlight with Reduce Motion), never a fill that grows with time.
 *
 * This takes no clock input on purpose: the same state always gives the same bar.
 */
export const DESIGN_COUNT = 4;

export type SegmentState = "done" | "active" | "waiting";

export interface GeneratingProgressInput {
  /** A generation request is running */
  loading: boolean;
  /** The project this screen is for */
  projectId?: string | null;
  /** The store's current project, if any */
  project?: { id: string; status?: string | null; generated_image_urls?: string[] | null } | null;
}

export interface GeneratingProgress {
  /** Designs that really exist (0-4) */
  readyCount: number;
  /** Segment index being worked on, or null when all are done */
  activeIndex: number | null;
  segments: SegmentState[];
  /** Visible label, e.g. "Design 1 of 4" (the one being made) */
  label: string;
  /** Screen-reader label for the bar, e.g. "Design 2 of 4 ready" */
  accessibilityLabel: string;
  accessibilityValue: { min: number; max: number; now: number; text: string };
}

export function countReadyDesigns(input: GeneratingProgressInput): number {
  const { loading, projectId, project } = input;
  if (loading || !project || !projectId || project.id !== projectId) return 0;
  if (project.status !== "generated") return 0;
  return Math.min(DESIGN_COUNT, (project.generated_image_urls ?? []).filter(Boolean).length);
}

export function getGeneratingProgress(input: GeneratingProgressInput): GeneratingProgress {
  const readyCount = countReadyDesigns(input);
  const activeIndex = readyCount < DESIGN_COUNT ? readyCount : null;
  const segments: SegmentState[] = Array.from({ length: DESIGN_COUNT }, (_, i) =>
    i < readyCount ? "done" : i === activeIndex ? "active" : "waiting"
  );
  const label = activeIndex === null ? `${DESIGN_COUNT} of ${DESIGN_COUNT} designs ready` : `Design ${activeIndex + 1} of ${DESIGN_COUNT}`;
  const accessibilityLabel =
    readyCount === 0
      ? `Creating design 1 of ${DESIGN_COUNT}`
      : readyCount === DESIGN_COUNT
        ? `All ${DESIGN_COUNT} designs ready`
        : `Design ${readyCount} of ${DESIGN_COUNT} ready`;
  return {
    readyCount,
    activeIndex,
    segments,
    label,
    accessibilityLabel,
    accessibilityValue: { min: 0, max: DESIGN_COUNT, now: readyCount, text: accessibilityLabel },
  };
}
