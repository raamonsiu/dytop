import {
  ERROR_SKIP_DELAY_MS,
  SKIPPABLE_YT_ERROR_CODES,
  YT_ERROR_KEYS,
  YT_PLAYER_VARS,
} from "@/constants/youtube";
import {
  MAX_TRACK_DURATION_SECONDS,
  PLAYER_READY_TIMEOUT_MS,
} from "@/constants/player";
import { setPlayerState } from "./playerStore";
import { loadYouTubeApi } from "./youtubeApi";

let player: YT.Player | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;

/** Set by the controller. Kept as a hook rather than an import so the engine
 * stays a leaf module: the controller imports the engine, never the reverse. */
let advanceHandler: (() => void) | null = null;

/** A load requested before the embed was ready, replayed on ready. */
let pending: { videoId: string; autoplay: boolean; startSeconds: number } | null = null;

let skipTimer: ReturnType<typeof setTimeout> | null = null;

function clearSkipTimer(): void {
  if (skipTimer) {
    clearTimeout(skipTimer);
    skipTimer = null;
  }
}

/** Registers the callback fired when the current track ends or is skipped. */
export function onAdvanceRequested(handler: () => void): void {
  advanceHandler = handler;
}

/** The currently registered advance callback, so callers can swap it in and
 * restore it later (the radio controller does exactly this). */
export function getAdvanceHandler(): (() => void) | null {
  return advanceHandler;
}

/**
 * The IFrame API sometimes reports UNSTARTED/CUED after a load with the embed
 * muted, a legacy of autoplay policies. The prototype re-asserted volume at
 * every such transition; so does this.
 */
function forceAudible(): void {
  try {
    player?.unMute();
    player?.setVolume(100);
  } catch {
    // Player not answering yet; the next state change will try again.
  }
}

function handleStateChange(event: YT.OnStateChangeEvent): void {
  switch (event.data) {
    case YT.PlayerState.PLAYING:
      setPlayerState({ status: "playing", duration: getDuration() });
      break;
    case YT.PlayerState.PAUSED:
      setPlayerState({ status: "paused" });
      break;
    case YT.PlayerState.BUFFERING:
      setPlayerState({ status: "buffering" });
      break;
    case YT.PlayerState.ENDED:
      setPlayerState({ status: "ended" });
      advanceHandler?.();
      break;
    case YT.PlayerState.UNSTARTED:
    case YT.PlayerState.CUED:
      forceAudible();
      break;
  }
}

function handleError(event: YT.OnErrorEvent): void {
  const code = Number(event.data);
  setPlayerState({ status: "error", errorKey: YT_ERROR_KEYS[code] ?? "unknown" });

  // Only per-video failures advance the queue. An origin rejection or an HTML5
  // fault breaks every video identically, so skipping would silently chew
  // through the whole queue instead of showing the problem once.
  if (SKIPPABLE_YT_ERROR_CODES.has(code)) {
    clearSkipTimer();
    skipTimer = setTimeout(() => advanceHandler?.(), ERROR_SKIP_DELAY_MS);
  }
}

function markReady(): void {
  if (ready) return;
  ready = true;
  forceAudible();
  setPlayerState({ ready: true });

  if (pending) {
    const { videoId, autoplay, startSeconds } = pending;
    pending = null;
    load(videoId, autoplay, startSeconds);
  }
}

/**
 * Creates the player, once per page load.
 *
 * Idempotent on purpose. StrictMode mounts effects twice in development, and
 * the host element is never unmounted, so there is no teardown path: destroying
 * the player on the first cleanup would leave the second mount holding a dead
 * embed. This is the usual cause of "audio works in the build but not in dev".
 */
export function initEngine(mount: HTMLElement): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = loadYouTubeApi().then(() => {
    player = new YT.Player(mount, {
      height: "1",
      width: "1",
      playerVars: { ...YT_PLAYER_VARS, origin: window.location.origin },
      events: {
        onReady: markReady,
        onStateChange: handleStateChange,
        onError: handleError,
      },
    });

    // onReady occasionally never arrives (privacy extensions, odd embeddings)
    // even though the player answers commands fine. Probe it rather than
    // leaving the transport permanently dead, as the prototype did.
    setTimeout(() => {
      if (ready || !player) return;
      try {
        player.getPlayerState();
        markReady();
      } catch {
        setPlayerState({ status: "error", errorKey: "notResponding" });
      }
    }, PLAYER_READY_TIMEOUT_MS);
  });

  return initPromise;
}

/**
 * Loads a video, playing or just cueing it, optionally starting mid-track.
 * Queues the request if the embed isn't ready yet.
 *
 * `startSeconds` is passed straight to the IFrame API's load/cue call rather
 * than applied via a follow-up `seek()`: calling `seekTo` right after
 * `loadVideoById` races the embed's own (asynchronous) load and is frequently
 * ignored, which is what silently restarted radio at 0:00 on every page load.
 */
export function load(videoId: string, autoplay: boolean, startSeconds = 0): void {
  clearSkipTimer();
  setPlayerState({ errorKey: null, duration: 0, status: "loading" });

  if (!ready || !player) {
    // Replayed by markReady(). Only the latest request is kept: queueing them
    // would play through every skipped track once the player woke up.
    pending = { videoId, autoplay, startSeconds };
    return;
  }

  if (autoplay) {
    player.loadVideoById({ videoId, startSeconds });
  } else {
    // cueVideoById loads metadata without starting playback, which is what a
    // restored session needs: browsers reject autoplay without a user gesture.
    player.cueVideoById({ videoId, startSeconds });
  }
}

export function play(): void {
  player?.playVideo();
}

/**
 * Pauses, and cancels any pending error-skip.
 *
 * Without this, stopping radio while a blocked-video skip was still pending
 * (and there was no personal-queue track to restore, so this is the branch
 * taken instead of `load()`) left the timer armed against the just-restored
 * queue advance handler: it would later fire and silently advance the queue
 * on its own, with no video error involved.
 */
export function pause(): void {
  clearSkipTimer();
  player?.pauseVideo();
}

export function seek(seconds: number): void {
  player?.seekTo(seconds, true);
}

/** Reads straight from the embed. Called by the clock on a timer, never during
 * render: it's a synchronous cross-frame call. */
export function getCurrentTime(): number {
  try {
    return player?.getCurrentTime() ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Duration in seconds, or 0 when there isn't a meaningful one.
 *
 * 0 is the contract for "unknown": nothing loaded yet, or a live stream, whose
 * reported duration is unbounded. Callers show elapsed time only and skip the
 * progress bar rather than rendering a bar that can never fill.
 */
export function getDuration(): number {
  try {
    const duration = player?.getDuration() ?? 0;
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    return duration > MAX_TRACK_DURATION_SECONDS ? 0 : duration;
  } catch {
    return 0;
  }
}
