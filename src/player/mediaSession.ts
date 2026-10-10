/**
 * Thin wrapper around the Media Session API.
 *
 * A registered session with a "playing" state and real transport handlers is
 * what tells Android/Chrome this tab is doing active media playback: that
 * status is what exempts it from background-tab suspension and is what backs
 * the lock-screen / notification transport controls, the same mechanism
 * YouTube's own site uses. Without it, backgrounding the app (or the device
 * screen locking) is indistinguishable from an idle tab and playback stops.
 * Feature-detected throughout: Safari and older browsers don't expose
 * `navigator.mediaSession` at all.
 */

const supported = typeof navigator !== "undefined" && "mediaSession" in navigator;

export interface MediaSessionTrack {
  title: string;
  artist: string;
  /** Artwork URL. YouTube thumbnails are JPEGs at a handful of fixed sizes;
   * the exact size is declared as 512x512 as a reasonable upper bound rather
   * than measured, since browsers pick the closest match anyway. */
  artwork: string;
}

export function setMediaSessionMetadata(track: MediaSessionTrack | null): void {
  if (!supported) return;
  navigator.mediaSession.metadata = track
    ? new MediaMetadata({
        title: track.title,
        artist: track.artist,
        artwork: [{ src: track.artwork, sizes: "512x512", type: "image/jpeg" }],
      })
    : null;
}

export function setMediaSessionPlaybackState(state: MediaSessionPlaybackState): void {
  if (!supported) return;
  navigator.mediaSession.playbackState = state;
}

export interface MediaSessionHandlers {
  play?: () => void;
  pause?: () => void;
  previoustrack?: () => void;
  nexttrack?: () => void;
  seekto?: (seconds: number) => void;
}

/**
 * Wires (or clears) the lock-screen/notification transport buttons.
 *
 * Every action not present in `handlers` is explicitly set to `null` rather
 * than left alone, so switching sessions (personal queue <-> radio) hides
 * buttons the previous session exposed instead of leaving them silently
 * wired to whatever track used to be playing.
 */
export function setMediaSessionHandlers(handlers: MediaSessionHandlers): void {
  if (!supported) return;
  const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Not every browser supports every action (e.g. Safari + "seekto").
    }
  };

  set("play", handlers.play ? () => handlers.play?.() : null);
  set("pause", handlers.pause ? () => handlers.pause?.() : null);
  set("previoustrack", handlers.previoustrack ? () => handlers.previoustrack?.() : null);
  set("nexttrack", handlers.nexttrack ? () => handlers.nexttrack?.() : null);
  set(
    "seekto",
    handlers.seekto
      ? (details) => handlers.seekto?.(details.seekTime ?? 0)
      : null,
  );
}
