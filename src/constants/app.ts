/** Single source of truth for paths, so links and the startup redirect can't
 * drift from the route table. */
export const ROUTES = {
  player: "/",
  history: "/history",
  legacy: "/legacy",
  legacyHistory: "/legacy/history",
  liveRadio: "/radio",
  legacyRadio: "/legacy/radio",
} as const;

/** Each view has its own player and history, so switching tabs never switches
 * visual mode. */
export const VIEW_ROUTES = {
  minimal: {
    player: ROUTES.player,
    history: ROUTES.history,
    radio: ROUTES.liveRadio,
  },
  legacy: {
    player: ROUTES.legacy,
    history: ROUTES.legacyHistory,
    radio: ROUTES.legacyRadio,
  },
} as const;

export type ViewTab = keyof (typeof VIEW_ROUTES)["minimal"];

/**
 * Which tab (player/radio/history) a pathname belongs to, for the given view.
 *
 * Used to carry the active tab across the view toggle: switching from
 * `/legacy/radio` to minimal should land on `/radio`, not always reset to the
 * player tab.
 */
export function tabForPath(view: keyof typeof VIEW_ROUTES, pathname: string): ViewTab {
  const routes = VIEW_ROUTES[view];
  const tab = (Object.keys(routes) as ViewTab[]).find((key) => routes[key] === pathname);
  return tab ?? "player";
}

/** localStorage namespace. Everything the app persists outside IndexedDB lives
 * under this one key as a single JSON blob. */
export const PREFS_STORAGE_KEY = "dytop:prefs";

/** The prototype capped recently-played at 30 entries. */
export const HISTORY_MAX = 30;

export const BACKGROUND_MODES = ["fixed", "random", "on-song-change"] as const;
export type BackgroundMode = (typeof BACKGROUND_MODES)[number];

/**
 * How much of the interface is on screen, most visible to least.
 *
 * `pinned` and `auto` differ only in whether the chrome hides itself: `auto` is
 * the prototype's reveal-on-approach behaviour, `pinned` keeps everything put
 * for anyone who finds that jumpy.
 *
 * Ordered deliberately: the control renders them in this sequence.
 */
export const UI_VISIBILITY_STATES = [
  "pinned",
  "auto",
  "ring-only",
  "hidden",
] as const;
export type UiVisibility = (typeof UI_VISIBILITY_STATES)[number];

export const DEFAULT_UI_VISIBILITY: UiVisibility = "auto";

/**
 * Values written by earlier versions, mapped to their closest equivalent.
 *
 * Preferences outlive releases, and an unrecognised value would otherwise leave
 * the UI in a state no control can represent: visibly stuck, with no way back.
 */
const LEGACY_UI_VISIBILITY: Record<string, UiVisibility> = {
  visible: "auto",
  "hidden-all": "hidden",
  "hidden-partial": "ring-only",
};

/** Coerces a stored value to a valid visibility state, mapping legacy names and falling back to the default. */
export function normalizeUiVisibility(value: unknown): UiVisibility {
  if (typeof value !== "string") return DEFAULT_UI_VISIBILITY;
  if ((UI_VISIBILITY_STATES as readonly string[]).includes(value)) {
    return value as UiVisibility;
  }
  return LEGACY_UI_VISIBILITY[value] ?? DEFAULT_UI_VISIBILITY;
}
