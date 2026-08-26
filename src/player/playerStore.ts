import { createStore, useStoreSelector } from "@/lib/createStore";
import type { PlaybackStatus } from "./types";

interface PlayerState {
  status: PlaybackStatus;
  /** Seconds. 0 until the player reports metadata for the loaded video. */
  duration: number;
  /** i18n key under `errors.player`, or null. Cleared on the next load. */
  errorKey: string | null;
  /** True once the embed responds to commands. */
  ready: boolean;
}

const INITIAL: PlayerState = {
  status: "idle",
  duration: 0,
  errorKey: null,
  ready: false,
};

/**
 * Discrete playback state only.
 *
 * Current time is deliberately absent: it changes every frame and belongs to
 * the rAF clock, which writes to the DOM directly. Putting it here would
 * re-render every subscriber ~60 times a second for a number that only ever
 * lands in a progress bar and a clock readout.
 */
export const playerStore = createStore<PlayerState>(INITIAL);

export function setPlayerState(patch: Partial<PlayerState>): void {
  playerStore.set((prev) => ({ ...prev, ...patch }));
}

export function usePlaybackStatus(): PlaybackStatus {
  return useStoreSelector(playerStore, (state) => state.status);
}

export function useDuration(): number {
  return useStoreSelector(playerStore, (state) => state.duration);
}

export function usePlayerError(): string | null {
  return useStoreSelector(playerStore, (state) => state.errorKey);
}

/** Buffering counts as playing for the transport icon: playback resumes on its
 * own, so flipping to a play triangle mid-stall reads as a stop. */
export function useIsPlaying(): boolean {
  return useStoreSelector(
    playerStore,
    (state) => state.status === "playing" || state.status === "buffering",
  );
}
