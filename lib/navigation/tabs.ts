/**
 * Per-tab navigation helpers.
 *
 * Each tab (Home, Explore, Vi, Profile) has its own stack. Detail screens are
 * shared routes that exist in the Home, Vi and Profile stacks, so `/project/123`
 * can live in Home's stack or Profile's stack. To open a screen in the tab the user is in
 * (keeping that tab highlighted), hrefs are prefixed with the tab's group:
 * `/(tabs)/(profile)/project/123`.
 */
import { isOutreachEnabled } from "@/lib/config/features";

export const TAB_GROUPS = ["(home)", "(explore)", "(vi)", "(profile)"] as const;
export type TabGroup = (typeof TAB_GROUPS)[number];

/** Root screen of each tab's stack (its route name inside the group). */
export const TAB_ROOT_ROUTE: Record<TabGroup, string> = {
  "(home)": "index",
  "(explore)": "explore",
  "(vi)": "vi",
  "(profile)": "profile",
};

/**
 * Tabs whose stacks carry the shared detail screens (project, results,
 * settings, edit profile, help, pros, Vi chat). Explore's stack only has the public
 * grid and a design's detail page. Home is first, so a cold link such as
 * /project/123 opens in Home's stack.
 */
export const SHARED_TAB_GROUPS = ["(home)", "(vi)", "(profile)"] as const;
export type SharedTabGroup = (typeof SHARED_TAB_GROUPS)[number];

export function isSharedTabGroup(value: string | undefined): value is SharedTabGroup {
  return !!value && (SHARED_TAB_GROUPS as readonly string[]).includes(value);
}

export function isTabGroup(value: string | undefined): value is TabGroup {
  return !!value && (TAB_GROUPS as readonly string[]).includes(value);
}

// The tab the user was last in. Root-stack flows (camera, generating, consent)
// sit above the tabs, so when they finish they return results to this tab.
let lastTabGroup: TabGroup = "(home)";

export function setLastTabGroup(group: TabGroup) {
  lastTabGroup = group;
}

export function getLastTabGroup(): TabGroup {
  return lastTabGroup;
}

/** The stack a shared detail screen should open in: the given tab, or Home from Explore. */
export function sharedStackFor(group: TabGroup | undefined): SharedTabGroup {
  return isSharedTabGroup(group) ? group : "(home)";
}

/** The tab group in the current route segments, if the route is inside the tabs. */
export function tabGroupFromSegments(segments: readonly string[]): TabGroup | undefined {
  if (segments[0] !== "(tabs)") return undefined;
  return isTabGroup(segments[1]) ? segments[1] : undefined;
}

/**
 * Href for a shared detail screen inside a given tab's stack, e.g.
 * tabHref("/project/123", "(profile)") → "/(tabs)/(profile)/project/123".
 * Explore has no shared screens, so from Explore they open in Home.
 */
/** The first screen of a tab, e.g. "/(tabs)/(home)" or "/(tabs)/(profile)/profile". */
export function tabRootHref(group: TabGroup | undefined = lastTabGroup): string {
  const g = group ?? "(home)";
  const route = TAB_ROOT_ROUTE[g];
  return route === "index" ? `/(tabs)/${g}` : `/(tabs)/${g}/${route}`;
}

export function tabHref(path: string, group: TabGroup | undefined = lastTabGroup): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/(tabs)/${sharedStackFor(group)}${clean}`;
}

/**
 * Where a "chat with Vi" entry goes: the Vi tab while Vi has a tab slot
 * (outreach off), otherwise Vi as a screen in the current tab's stack.
 * Either way Vi shows the AI consent screen first if consent isn't recorded.
 */
export function viHref(group: TabGroup | undefined = lastTabGroup): string {
  return isOutreachEnabled() ? tabHref("/assistant-chat", group) : "/(tabs)/(vi)/vi";
}
