import { useCallback } from "react";
import { useRouter, useSegments } from "expo-router";
import { getLastTabGroup, tabGroupFromSegments, tabHref, tabRootHref, type TabGroup } from "./tabs";

/** The tab the current screen belongs to (or the last tab, from a root-stack flow). */
export function useCurrentTabGroup(): TabGroup {
  const segments = useSegments();
  return tabGroupFromSegments(segments) ?? getLastTabGroup();
}

/**
 * Navigation that keeps the user inside their current tab: `push("/project/1")`
 * from Profile opens Profile's copy of the project page, so Profile stays
 * highlighted and back returns to Profile.
 */
export function useTabNavigation() {
  const router = useRouter();
  const group = useCurrentTabGroup();

  /** Push a shared detail screen onto the current tab's stack. */
  const push = useCallback((path: string) => router.push(tabHref(path, group) as any), [router, group]);

  /**
   * Go to a shared detail screen in the current tab: pop back to it if it's
   * already in the stack, otherwise replace the current screen with it.
   */
  const dismissTo = useCallback((path: string) => router.dismissTo(tabHref(path, group) as any), [router, group]);

  /**
   * Back within the tab. A detail page opened straight from a link has nothing
   * under it, so back goes to the tab's first screen instead of doing nothing.
   */
  const back = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(tabRootHref(group) as any);
  }, [router, group]);

  return { push, dismissTo, back, group };
}
