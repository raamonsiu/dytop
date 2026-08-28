type SafeAreaEdge = "top" | "right" | "bottom" | "left";

/**
 * CSS for an edge offset that clears a notch, home indicator or rounded
 * corner, without adding a gap on ordinary screens: `max()` picks whichever
 * of the two is larger.
 */
export function safeAreaOffset(edge: SafeAreaEdge, fallbackRem: number): string {
  return `max(${fallbackRem}rem, env(safe-area-inset-${edge}))`;
}
