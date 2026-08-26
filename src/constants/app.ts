export const APP_NAME = "DYTOP";

/** Single source of truth for paths, so links and the startup redirect can't
 * drift from the route table. */
export const ROUTES = {
  radio: "/",
  history: "/history",
  legacy: "/legacy",
} as const;

/** localStorage namespace. Everything the app persists outside IndexedDB lives
 * under this one key as a single JSON blob. */
export const PREFS_STORAGE_KEY = "dytop:prefs";

/** The prototype capped recently-played at 30 entries. */
export const HISTORY_MAX = 30;

export const BACKGROUND_MODES = ["fixed", "random", "on-song-change"] as const;
export type BackgroundMode = (typeof BACKGROUND_MODES)[number];

/** Legacy's hide-UI control cycles through these three states: everything
 * visible, everything hidden, or chrome hidden with the progress ring kept. */
export const UI_VISIBILITY_STATES = [
  "visible",
  "hidden-all",
  "hidden-partial",
] as const;
export type UiVisibility = (typeof UI_VISIBILITY_STATES)[number];
