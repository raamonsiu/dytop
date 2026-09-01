import { PROGRESS_POLL_MS } from "@/constants/player";
import { getCurrentTime, getDuration } from "./engine";
import { playerStore } from "./playerStore";

export interface PlaybackTime {
  current: number;
  duration: number;
}

type TimeListener = (time: PlaybackTime) => void;

const listeners = new Set<TimeListener>();

let rafId: number | null = null;
/** Last value read from the embed, and when it was read. */
let polledTime = 0;
let polledAt = 0;
let duration = 0;

function isAdvancing(): boolean {
  const { status } = playerStore.get();
  return status === "playing" || status === "buffering";
}

function poll(): void {
  polledTime = getCurrentTime();
  polledAt = performance.now();
  duration = getDuration();
}

function emit(): void {
  // Between polls, advance the last reading by wall-clock time. The IFrame API
  // has no timeupdate event and answering getCurrentTime() is a cross-frame
  // call, so polling it every frame would be both wasteful and no smoother.
  const elapsed = isAdvancing() ? (performance.now() - polledAt) / 1000 : 0;
  const estimated = polledTime + elapsed;
  const current = duration > 0 ? Math.min(estimated, duration) : estimated;

  for (const listener of listeners) listener({ current, duration });
}

function loop(): void {
  if (performance.now() - polledAt >= PROGRESS_POLL_MS) poll();
  emit();
  rafId = requestAnimationFrame(loop);
}

/**
 * Starts the frame loop only while something is both listening and moving.
 *
 * A paused player still needs one emit so the UI lands on the right position,
 * but not a frame loop doing nothing 60 times a second.
 */
function sync(): void {
  const shouldRun = listeners.size > 0 && isAdvancing();

  if (shouldRun && rafId === null) {
    poll();
    rafId = requestAnimationFrame(loop);
    return;
  }

  if (!shouldRun && rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (!shouldRun && listeners.size > 0) {
    poll();
    emit();
  }
}

playerStore.subscribe(sync);

/**
 * Subscribes to playback time.
 *
 * Listeners are called on every animation frame and must write to the DOM
 * directly: setting React state here would re-render the tree ~60 times a
 * second. See LinearProgress and PerimeterProgress for the pattern.
 */
export function subscribeToTime(listener: TimeListener): () => void {
  listeners.add(listener);
  sync();
  // Give the new listener a value immediately rather than leaving it blank
  // until the next frame or state change.
  poll();
  listener({ current: polledTime, duration });

  return () => {
    listeners.delete(listener);
    sync();
  };
}

/**
 * Forces an immediate re-read, or, given `optimisticSeconds`, pretends the
 * embed already landed there.
 *
 * Called right after a seek. Reading the embed at that point (the no-arg
 * path) is what this used to do, but the IFrame API's `seekTo` crosses a
 * postMessage bridge: `getCurrentTime()` called immediately after still
 * answers with the pre-seek position, so polling here snapped the bar back
 * to where it was for the ~300ms until the embed actually caught up — a
 * flicker on a quick click, and a stale target for a second quick click to
 * land on instead of its own. Trusting the seek's own target instead avoids
 * reading the embed before it's ready to answer correctly; the next regular
 * poll then confirms it once the embed catches up.
 */
export function resyncClock(optimisticSeconds?: number): void {
  if (optimisticSeconds !== undefined) {
    polledTime = optimisticSeconds;
    polledAt = performance.now();
    emit();
    return;
  }

  poll();
  emit();
}
