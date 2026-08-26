import { HISTORY_MAX } from "@/constants/app";
import { createStore, useStoreSelector } from "@/lib/createStore";
import { readState, writeState } from "@/lib/idb";
import type { QueueState, Track } from "./types";

const QUEUE_STATE_KEY = "queue";

const EMPTY: QueueState = { history: [], nowPlaying: null, upcoming: [] };

export const queueStore = createStore<QueueState>(EMPTY);

/** Debounced so a drag-reorder doesn't write once per pointer move. */
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void writeState(QUEUE_STATE_KEY, queueStore.get()).catch(() => {
      // Losing the saved queue is not worth interrupting playback over.
    });
  }, 250);
}

function update(next: QueueState): void {
  queueStore.set(next);
  persist();
}

/** Restores the saved queue. Playback is not resumed — see controller. */
export async function hydrateQueue(): Promise<QueueState> {
  const saved = await readState<QueueState>(QUEUE_STATE_KEY).catch(() => undefined);
  if (!saved) return EMPTY;

  // Stored across app versions and hand-editable via devtools, so shape is
  // checked rather than trusted.
  const restored: QueueState = {
    history: Array.isArray(saved.history) ? saved.history.slice(-HISTORY_MAX) : [],
    nowPlaying: saved.nowPlaying ?? null,
    upcoming: Array.isArray(saved.upcoming) ? saved.upcoming : [],
  };
  queueStore.set(restored);
  return restored;
}

export function enqueue(track: Track): void {
  const state = queueStore.get();
  update({ ...state, upcoming: [...state.upcoming, track] });
}

/**
 * Moves to the next track: the current one joins history, the head of upcoming
 * becomes current. Returns it so the caller can decide whether to autoplay.
 */
export function advance(): Track | null {
  const state = queueStore.get();
  const [next = null, ...rest] = state.upcoming;

  update({
    history: pushHistory(state.history, state.nowPlaying),
    nowPlaying: next,
    upcoming: rest,
  });

  return next;
}

/** Steps back to the most recent history entry, pushing the current track back
 * to the front of upcoming so it isn't lost. */
export function goBack(): Track | null {
  const state = queueStore.get();
  const previous = state.history.at(-1);
  if (!previous) return null;

  update({
    history: state.history.slice(0, -1),
    nowPlaying: previous,
    upcoming: state.nowPlaying ? [state.nowPlaying, ...state.upcoming] : state.upcoming,
  });

  return previous;
}

/**
 * Jumps straight to a track from any list.
 *
 * Everything the jump skipped over stays where it was rather than being
 * dropped: picking the third item in the queue leaves the first two queued.
 */
export function jumpTo(trackId: string): Track | null {
  const state = queueStore.get();

  const fromUpcoming = state.upcoming.find((track) => track.id === trackId);
  if (fromUpcoming) {
    update({
      history: pushHistory(state.history, state.nowPlaying),
      nowPlaying: fromUpcoming,
      upcoming: state.upcoming.filter((track) => track.id !== trackId),
    });
    return fromUpcoming;
  }

  const fromHistory = state.history.find((track) => track.id === trackId);
  if (fromHistory) {
    update({
      history: pushHistory(
        state.history.filter((track) => track.id !== trackId),
        state.nowPlaying,
      ),
      nowPlaying: fromHistory,
      upcoming: state.upcoming,
    });
    return fromHistory;
  }

  return null;
}

export function removeFromUpcoming(trackId: string): void {
  const state = queueStore.get();
  update({
    ...state,
    upcoming: state.upcoming.filter((track) => track.id !== trackId),
  });
}

/** Reorders upcoming by moving one entry to a new index. */
export function reorderUpcoming(fromIndex: number, toIndex: number): void {
  const state = queueStore.get();
  const upcoming = [...state.upcoming];
  const [moved] = upcoming.splice(fromIndex, 1);
  if (!moved) return;
  upcoming.splice(toIndex, 0, moved);
  update({ ...state, upcoming });
}

export function clearHistory(): void {
  update({ ...queueStore.get(), history: [] });
}

function pushHistory(history: Track[], track: Track | null): Track[] {
  if (!track) return history;
  return [...history, track].slice(-HISTORY_MAX);
}

export function useNowPlaying(): Track | null {
  return useStoreSelector(queueStore, (state) => state.nowPlaying);
}

export function useHistory(): Track[] {
  return useStoreSelector(queueStore, (state) => state.history);
}

export function useUpcoming(): Track[] {
  return useStoreSelector(queueStore, (state) => state.upcoming);
}
