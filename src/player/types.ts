/** A queue entry. */
export interface Track {
  /**
   * Identifies this entry, not the video. The same video can sit in the queue
   * more than once, so reordering and removal key off this instead of videoId.
   */
  id: string;
  videoId: string;
  /** Raw YouTube title, shown in the UI. */
  title: string;
  /** Channel name. */
  author: string;
  thumb: string;
  /** Heuristic split of `title`, used only for the lyrics lookup. */
  artistGuess: string;
  titleGuess: string;
}

/**
 * Three lists rather than one array plus an index.
 *
 * Playback only ever moves an item between lists, so "what's next" and "what
 * already played" are never derived from arithmetic that can go out of range —
 * which is what made the prototype's drag-and-drop reordering safe.
 */
export interface QueueState {
  /** Most recent last, capped at HISTORY_MAX. */
  history: Track[];
  nowPlaying: Track | null;
  upcoming: Track[];
}

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error";
