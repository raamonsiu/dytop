import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS } from "@/constants/player";
import { createStore, type Store } from "@/lib/createStore";
import type { SearchPage, SearchResult } from "./search";

export type SearchStatus = "idle" | "loading" | "ready" | "error";

export interface TrackSearchState {
  /** The trimmed query the status and results belong to. */
  query: string;
  status: SearchStatus;
  results: SearchResult[];
  /** Token for the next page; null once the results are exhausted. */
  continuation: string | null;
  loadingMore: boolean;
}

export interface TrackSearchDeps {
  search: (query: string, signal: AbortSignal) => Promise<SearchPage>;
  searchMore: (continuation: string, signal: AbortSignal) => Promise<SearchPage>;
  debounceMs?: number;
  minChars?: number;
}

export interface TrackSearch {
  store: Store<TrackSearchState>;
  /** Call on every keystroke; the session decides when to actually search. */
  setQuery: (query: string) => void;
  /** Appends the next page, if there is one and nothing is in flight. */
  loadMore: () => void;
  /** Cancels whatever is pending or in flight. */
  dispose: () => void;
}

export const IDLE_SEARCH: TrackSearchState = {
  query: "",
  status: "idle",
  results: [],
  continuation: null,
  loadingMore: false,
};

/** Continuation pages sometimes repeat a video from an earlier page, and a
 * duplicate row would also break the list's keys. */
function appendUnique(existing: SearchResult[], incoming: SearchResult[]): SearchResult[] {
  const seen = new Set(existing.map((result) => result.videoId));
  const fresh = incoming.filter((result) => {
    if (seen.has(result.videoId)) return false;
    seen.add(result.videoId);
    return true;
  });
  return fresh.length > 0 ? [...existing, ...fresh] : existing;
}

/**
 * Search-as-you-type for the add-song field.
 *
 * Only the latest query may write results: every request owns an
 * AbortController, and a response that arrives after its query was superseded
 * is discarded even if the abort lost the race. Results from the previous
 * query stay on screen while the next one loads, so typing doesn't blank the
 * list on every word.
 */
export function createTrackSearch({
  search,
  searchMore,
  debounceMs = SEARCH_DEBOUNCE_MS,
  minChars = SEARCH_MIN_CHARS,
}: TrackSearchDeps): TrackSearch {
  const store = createStore<TrackSearchState>(IDLE_SEARCH);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: AbortController | null = null;

  function cancel() {
    if (timer) clearTimeout(timer);
    timer = null;
    inFlight?.abort();
    inFlight = null;
  }

  async function run(query: string) {
    const controller = new AbortController();
    inFlight = controller;
    try {
      const page = await search(query, controller.signal);
      if (inFlight !== controller) return;
      inFlight = null;
      store.set({
        query,
        status: "ready",
        results: appendUnique([], page.results),
        continuation: page.continuation,
        loadingMore: false,
      });
    } catch {
      if (inFlight !== controller) return;
      inFlight = null;
      store.set({ ...IDLE_SEARCH, query, status: "error" });
    }
  }

  function setQuery(raw: string) {
    const query = raw.trim();
    const current = store.get();
    // Trailing spaces while typing the next word are not a new query.
    if (query === current.query && current.status !== "idle") return;

    cancel();
    if (query.length < minChars) {
      store.set(IDLE_SEARCH);
      return;
    }

    store.set({ ...current, query, status: "loading", loadingMore: false });
    timer = setTimeout(() => {
      timer = null;
      void run(query);
    }, debounceMs);
  }

  async function loadMore() {
    const current = store.get();
    if (current.status !== "ready" || !current.continuation || current.loadingMore) return;

    const controller = new AbortController();
    inFlight = controller;
    store.set({ ...current, loadingMore: true });
    try {
      const page = await searchMore(current.continuation, controller.signal);
      if (inFlight !== controller) return;
      inFlight = null;
      const latest = store.get();
      store.set({
        ...latest,
        results: appendUnique(latest.results, page.results),
        continuation: page.continuation,
        loadingMore: false,
      });
    } catch {
      if (inFlight !== controller) return;
      inFlight = null;
      // Dropping the token stops the list from retrying on every scroll; the
      // rows already shown stay usable.
      store.set({ ...store.get(), continuation: null, loadingMore: false });
    }
  }

  return {
    store,
    setQuery,
    loadMore: () => void loadMore(),
    dispose: cancel,
  };
}
