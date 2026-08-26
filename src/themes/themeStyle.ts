import type { CSSProperties } from "react";
import { THEME_TOKENS, type Theme } from "./tokens";

/**
 * Turns a palette into the inline `style` for a view's root element.
 *
 * Themes are applied per subtree rather than on `<html>` because both views can
 * exist in one session and must not fight over `:root`. Declarative inline
 * styles beat an imperative `applyTheme(el)` effect here — no ref, no effect
 * ordering, and the vars are present on the very first paint.
 *
 * `accent` lands on `--accent-base`, not `--accent`: globals.css derives
 * `--accent` from it through `--accent-override`, which is how legacy's
 * background-sampled accent takes over without editing the palette.
 */
export function themeStyle(theme: Theme): CSSProperties {
  const style: Record<string, string> = {};
  for (const token of THEME_TOKENS) {
    style[token === "accent" ? "--accent-base" : `--${token}`] = theme[token];
  }
  return style as CSSProperties;
}
