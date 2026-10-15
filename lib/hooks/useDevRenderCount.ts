/**
 * Dev mock mode only (e2e): counts renders of a component in
 * window.__renderCounts[name], so tests can prove a gesture causes no React
 * render per move. Does nothing in real builds.
 */
const enabled = __DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true" && typeof window !== "undefined";

export function useDevRenderCount(name: string): void {
  if (!enabled) return;
  const w = window as unknown as { __renderCounts?: Record<string, number> };
  w.__renderCounts ??= {};
  w.__renderCounts[name] = (w.__renderCounts[name] ?? 0) + 1;
}
