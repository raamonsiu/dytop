import { useSyncExternalStore } from "react";

function subscribe(query: string, callback: () => void): () => void {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/**
 * Live media query match.
 *
 * False on the first server/pre-hydration render rather than throwing: jsdom
 * and SSR have no `matchMedia`, and the real value arrives a frame later once
 * the browser's is read.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => window.matchMedia(query).matches,
    () => false,
  );
}
