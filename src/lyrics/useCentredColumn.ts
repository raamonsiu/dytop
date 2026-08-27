import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

interface CentredColumn<C extends HTMLElement, L extends HTMLElement> {
  /** Attach to the scrolling column that holds the lines. */
  columnRef: React.RefObject<C | null>;
  /** Attach to the currently active line. */
  activeLineRef: React.RefObject<L | null>;
}

/**
 * Keeps the focused lyric line at the vertical centre of its container.
 *
 * The column's own top edge sits at the container's midpoint (`top-1/2`), so
 * centring a line means pulling it up by its own offset, nothing else. An
 * earlier version also subtracted half the container height, which pushed the
 * whole column half a screen down and out of view.
 *
 * Recomputed on layout changes, not only when the line changes. The offsets are
 * measured, and measurements taken at mount go stale as soon as anything
 * reflows: the web font swapping in changes every line's height, and a resize
 * changes how lines wrap. Without this the column settles tens of pixels off
 * centre on a cold load and stays there until the next line.
 */
export function useCentredColumn<C extends HTMLElement, L extends HTMLElement>(
  /** Anything that should force a recentre, e.g. the active index. */
  deps: unknown[],
): CentredColumn<C, L> {
  const columnRef = useRef<C>(null);
  const activeLineRef = useRef<L>(null);

  const centre = useCallback(() => {
    const column = columnRef.current;
    if (!column) return;

    // Before the first timestamp there is no active line, and most tracks open
    // with an intro. Centring the first line keeps the lyrics on screen rather
    // than parked below the fold until the singing starts.
    const target = activeLineRef.current ?? column.firstElementChild;
    if (!(target instanceof HTMLElement)) return;

    column.style.transform = `translateY(${-(target.offsetTop + target.offsetHeight / 2)}px)`;
  }, []);

  useLayoutEffect(centre, [centre, ...deps]);

  useEffect(() => {
    const column = columnRef.current;
    if (!column) return;

    // Catches the font swap and any wrap change; window resize alone would miss
    // a reflow that doesn't change the viewport.
    const observer = new ResizeObserver(centre);
    observer.observe(column);
    window.addEventListener("resize", centre);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", centre);
    };
  }, [centre]);

  return { columnRef, activeLineRef };
}
