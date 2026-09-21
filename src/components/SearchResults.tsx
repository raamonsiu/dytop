import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { smallThumbnailUrl } from "@/constants/youtube";
import { cn } from "@/lib/cn";
import { searchOptionId } from "@/lib/useSongSearchField";
import type { SearchResult } from "@/lib/youtube/search";
import type { TrackSearchState } from "@/lib/youtube/trackSearch";

/** How far ahead of the end the next page is requested, so a steady scroll
 * rarely reaches the bottom before it arrives. */
const LOAD_MORE_MARGIN_PX = 120;

/**
 * - `above`: floats over the view, growing upward from the field, best match
 *   nearest it, the way a terminal fuzzy finder does. For a field at the
 *   bottom of the screen.
 * - `below`: floats over the view under the field.
 * - `inline`: takes room in the flow, for a field that already lives inside a
 *   popover of its own.
 */
export type SearchResultsPlacement = "above" | "below" | "inline";

interface SearchResultsProps {
  id: string;
  search: TrackSearchState;
  activeId: string | null;
  placement: SearchResultsPlacement;
  /** Container skin: border, background, radius. Placement is handled here. */
  className?: string;
  /** Lettering of the status lines, so each view can use its own voice. */
  noticeClassName?: string;
  onPick: (result: SearchResult) => void;
  onLoadMore: () => void;
}

/**
 * The listbox of search results for the add-song field.
 *
 * The floating placements are absolute rather than fixed or portalled, because
 * the root's CSS `zoom` makes coordinates measured from the field unreliable;
 * the minimal player lifts its chrome's overflow clip while the combobox is
 * expanded so the list isn't cut off.
 *
 * No visible scrollbar: it clashed with both views, and the wheel, touch and
 * the arrow keys (which scroll the highlight into view) already cover it.
 *
 * Rows are never focusable. Focus stays in the field (combobox pattern, with
 * `aria-activedescendant`), and mousedown is cancelled so a click can't blur
 * the field and close the list before the click itself lands.
 */
export function SearchResults({
  id,
  search,
  activeId,
  placement,
  className,
  noticeClassName = "uppercase tracking-widest",
  onPick,
  onLoadMore,
}: SearchResultsProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { status, results, continuation, loadingMore } = search;
  const reversed = placement === "above";

  // Rebuilt whenever the rows change: an observer only reports transitions,
  // so a first page too short to scroll would otherwise never ask for more.
  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !continuation) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { root, rootMargin: `${LOAD_MORE_MARGIN_PX}px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [results.length, continuation, onLoadMore]);

  useEffect(() => {
    if (!activeId) return;
    document.getElementById(searchOptionId(id, activeId))?.scrollIntoView({ block: "nearest" });
  }, [id, activeId]);

  let notice: { key: string; tone: "muted" | "danger" } | null = null;
  if (status === "error") notice = { key: "search.unavailable", tone: "danger" };
  else if (results.length === 0 && status === "loading") notice = { key: "search.loading", tone: "muted" };
  else if (results.length === 0 && status === "ready") notice = { key: "search.empty", tone: "muted" };

  return (
    <div
      ref={scrollRef}
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        "no-scrollbar flex max-h-64 overflow-y-auto overscroll-contain short:max-h-36",
        // column-reverse also makes the scroll start at the bottom, i.e. at
        // the best match, and lets the next page grow away from the field.
        reversed ? "flex-col-reverse" : "flex-col",
        placement === "above" && "absolute inset-x-0 bottom-full z-20 mb-1",
        placement === "below" && "absolute inset-x-0 top-full z-20 mt-1",
        placement === "inline" && "mt-2",
        className,
      )}
    >
      {notice ? (
        <p
          role="status"
          className={cn(
            "px-3 py-2 text-[11px]",
            noticeClassName,
            notice.tone === "danger" ? "text-danger" : "text-muted-foreground",
          )}
        >
          {t(notice.key)}
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul
          id={id}
          role="listbox"
          aria-label={t("search.results")}
          aria-busy={status === "loading" || loadingMore}
          className={cn(
            "flex shrink-0",
            reversed ? "flex-col-reverse" : "flex-col",
            // Stale rows from the previous query stay put while the next one
            // loads, dimmed so it's clear they're about to change.
            status === "loading" && "opacity-50 transition-opacity",
          )}
        >
          {results.map((result) => (
            <ResultRow
              key={result.videoId}
              id={searchOptionId(id, result.videoId)}
              result={result}
              active={result.videoId === activeId}
              onPick={onPick}
            />
          ))}
        </ul>
      ) : null}

      {loadingMore ? (
        <p className={cn("shrink-0 px-3 py-1.5 text-[10px] text-muted-foreground", noticeClassName)}>
          {t("search.loadingMore")}
        </p>
      ) : null}
      <div ref={sentinelRef} aria-hidden className="h-px shrink-0" />
    </div>
  );
}

function ResultRow({
  id,
  result,
  active,
  onPick,
}: {
  id: string;
  result: SearchResult;
  active: boolean;
  onPick: (result: SearchResult) => void;
}) {
  const meta = [result.author, result.views].filter(Boolean).join(" · ");

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onClick={() => onPick(result)}
      className={cn(
        // Half the view's radius: 0 in minimal, and in legacy a softer corner
        // than the panel's own, which looked bloated on a 64px thumbnail.
        "flex cursor-pointer items-center gap-3 rounded-[calc(var(--radius-view)/2)] px-2 py-1.5 transition-colors",
        active ? "bg-accent/15" : "hover:bg-accent/10",
      )}
    >
      <img
        src={smallThumbnailUrl(result.videoId)}
        alt=""
        loading="lazy"
        className="aspect-video w-16 shrink-0 rounded-[calc(var(--radius-view)/2)] object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-xs", active ? "text-accent" : "text-foreground")}>
          {result.title}
        </p>
        {meta ? (
          <p className="truncate text-[10px] tracking-wide text-muted-foreground">{meta}</p>
        ) : null}
      </div>
      <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
        {result.duration}
      </span>
    </li>
  );
}
