import type { ColorScheme, Theme, ViewName } from "./tokens";

/**
 * `minimal` is lifted verbatim from the D1ITO portfolio's dark palette so the
 * two sites read as the same hand: near-black surfaces, a single purple accent,
 * a lime selection that's the accent's complement, and square corners.
 *
 * `legacy` keeps the prototype's own palette: warm off-white ink on an almost
 * black green, lime accent, rounded corners, frosted panels. It's a different
 * mood on purpose, not a drifted copy.
 */
export const THEMES = {
  "minimal-dark": {
    background: "#0a0a0a",
    foreground: "#f5f5f5",
    surface: "#0a0a0a",
    "surface-border": "#262626",
    "muted-foreground": "#a3a3a3",
    accent: "#8806fa",
    "accent-foreground": "#ffffff",
    "accent-glow": "rgba(136, 6, 250, 0.28)",
    success: "#22c55e",
    danger: "#f87171",
    "selection-background": "#baf23f",
    "selection-foreground": "#10160a",
    radius: "0px",
    // No frosted glass in minimal: the panels sit flat on the dither, so the
    // glass tokens resolve to the opaque surface rather than going unused.
    glass: "#0a0a0a",
    "glass-strong": "#0a0a0a",
    "glass-border": "#262626",
  },
  "legacy-dark": {
    background: "#0a0b09",
    foreground: "#f2f4ef",
    surface: "#12140f",
    "surface-border": "rgba(242, 244, 239, 0.14)",
    "muted-foreground": "rgba(242, 244, 239, 0.62)",
    accent: "#c8e06a",
    "accent-foreground": "#10160a",
    "accent-glow": "rgba(200, 224, 106, 0.28)",
    success: "#c8e06a",
    danger: "#e0806a",
    "selection-background": "#c8e06a",
    "selection-foreground": "#10160a",
    radius: "14px",
    glass: "rgba(14, 16, 13, 0.46)",
    "glass-strong": "rgba(10, 12, 9, 0.72)",
    "glass-border": "rgba(242, 244, 239, 0.14)",
  },
} satisfies Record<string, Theme>;

export type ThemeName = keyof typeof THEMES;

/**
 * Resolves the palette for a view, falling back to its dark variant when the
 * requested scheme doesn't exist yet.
 *
 * Only dark themes ship today. This is the seam that keeps it that way without
 * scattering assumptions: dropping a `minimal-light` entry into THEMES makes
 * light mode live everywhere, with no call site to update.
 */
export function resolveTheme(view: ViewName, scheme: ColorScheme): Theme {
  const requested = `${view}-${scheme}`;
  if (requested in THEMES) {
    return THEMES[requested as ThemeName];
  }
  return THEMES[`${view}-dark`];
}
