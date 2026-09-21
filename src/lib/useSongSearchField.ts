import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAddSongForm } from "@/lib/useAddSongForm";
import { useTrackSearch } from "@/lib/useTrackSearch";
import { classifyQuery } from "@/lib/youtube/classifyQuery";
import type { SearchResult } from "@/lib/youtube/search";

/** DOM id of one result row, shared by the listbox and the combobox's
 * `aria-activedescendant`. */
export function searchOptionId(listId: string, videoId: string): string {
  return `${listId}-${videoId}`;
}

/**
 * Everything behind the "paste a URL or search" field except its looks, so
 * both views behave identically and differ only in styling.
 *
 * Anything that looks like a link goes down the paste path unchanged; anything
 * else searches as you type, through the same-origin InnerTube proxy (see
 * `lib/youtube/search`). Picking a result queues it exactly like a paste.
 *
 * `resultsAbove` flips the arrow keys for a list that grows upward from the
 * field, so "into the list" is always the key pointing at it.
 */
export function useSongSearchField({ resultsAbove = false }: { resultsAbove?: boolean } = {}) {
  const { t } = useTranslation();
  const listId = useId();
  const form = useAddSongForm();
  const { url, setUrl, focused, setFocused, handleSubmit, addSearchResult } = form;

  const kind = classifyQuery(url);
  const search = useTrackSearch(kind === "search" ? url : "");
  // Escape hides the list without throwing away what was typed; the next
  // keystroke or focus brings it back.
  const [dismissed, setDismissed] = useState(false);
  // Keyed by video rather than position, so a page appended below, or a new
  // query's rows, can never silently move the highlight onto another track.
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const open = kind === "search" && focused && !dismissed && search.status !== "idle";
  const { results } = search;
  const activeIndex = results.findIndex((result) => result.videoId === activeVideoId);
  const active = open && activeIndex >= 0 ? results[activeIndex] : undefined;
  // Enter with nothing highlighted takes the top hit, but only once it belongs
  // to what is actually typed, not to the query before the last keystroke.
  const pick = active ?? (search.status === "ready" ? results[0] : undefined);

  function choose(result: SearchResult) {
    addSearchResult(result);
    setActiveVideoId(null);
  }

  function onSubmit(event: React.FormEvent) {
    if (kind !== "search") {
      void handleSubmit(event);
      return;
    }
    event.preventDefault();
    if (pick) choose(pick);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      // Only the list closes: a surrounding popover (legacy's panel) listens
      // for Escape on the document and would otherwise close with it.
      event.stopPropagation();
      setDismissed(true);
      return;
    }
    if ((event.key !== "ArrowDown" && event.key !== "ArrowUp") || !open || results.length === 0) {
      return;
    }
    event.preventDefault();
    // Stepping back out of the first row returns to the field.
    const intoList = resultsAbove ? "ArrowUp" : "ArrowDown";
    const step = event.key === intoList ? 1 : -1;
    const next = Math.min(Math.max(activeIndex + step, -1), results.length - 1);
    setActiveVideoId(next >= 0 ? (results[next]?.videoId ?? null) : null);
  }

  const inputProps = {
    // text, not url: a search query would fail the browser's own URL
    // validation and block the submit before it ever reached us.
    type: "text",
    role: "combobox",
    "aria-autocomplete": "list",
    "aria-expanded": open,
    "aria-controls": open ? listId : undefined,
    "aria-activedescendant": active ? searchOptionId(listId, active.videoId) : undefined,
    autoComplete: "off",
    spellCheck: false,
    enterKeyHint: kind === "search" ? "search" : "go",
    placeholder: t("player.searchOrPaste"),
    "aria-label": t("player.searchOrPaste"),
    value: url,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setUrl(event.target.value);
      setDismissed(false);
    },
    onKeyDown,
    onFocus: () => {
      setFocused(true);
      setDismissed(false);
    },
    onBlur: () => setFocused(false),
  } satisfies React.InputHTMLAttributes<HTMLInputElement>;

  const resultsProps = open
    ? {
        id: listId,
        search,
        activeId: active?.videoId ?? null,
        onPick: choose,
        onLoadMore: search.loadMore,
      }
    : null;

  return {
    ...form,
    onSubmit,
    inputProps,
    resultsProps,
    /** False while a search has nothing to add yet, so the button can say so. */
    canSubmit: !form.pending && (kind !== "search" || pick !== undefined),
  };
}
