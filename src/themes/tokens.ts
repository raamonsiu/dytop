/**
 * The design-token contract shared by both views.
 *
 * Declaring the names as a tuple rather than an interface means `Theme` is a
 * total map: adding a token here breaks every theme that doesn't define it,
 * which is the point — a half-filled palette should not typecheck.
 *
 * Values are raw CSS, not parsed colours, so a token can be a hex, an rgba()
 * or a length (`radius`) without a second representation to keep in sync.
 */
export const THEME_TOKENS = [
  "background",
  "foreground",
  "surface",
  "surface-border",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "accent-glow",
  "success",
  "danger",
  "selection-background",
  "selection-foreground",
  /** Corner rounding for the whole view: 0 in minimal, 14px in legacy. */
  "radius",
  /** Translucent panel fills. Minimal sets these opaque — it has no glass. */
  "glass",
  "glass-strong",
  "glass-border",
] as const;

export type ThemeTokenName = (typeof THEME_TOKENS)[number];

export type Theme = Record<ThemeTokenName, string>;

/** The two visual languages the app ships. */
export type ViewName = "minimal" | "legacy";

export type ColorScheme = "dark" | "light";
