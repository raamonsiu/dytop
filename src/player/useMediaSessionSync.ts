import { useEffect } from "react";
import { entryToTrack } from "@/radio/position";
import { radioStore } from "@/radio/controller";
import { playNext, playPrevious, seekTo, togglePlayPause } from "./controller";
import {
  setMediaSessionHandlers,
  setMediaSessionMetadata,
  setMediaSessionPlaybackState,
  type MediaSessionTrack,
} from "./mediaSession";
import { playerStore } from "./playerStore";
import { queueStore } from "./queueStore";
import type { PlaybackStatus, Track } from "./types";

function trackToMediaSession(track: Track): MediaSessionTrack {
  return { title: track.title, artist: track.author, artwork: track.thumb };
}

function playbackStateFor(status: PlaybackStatus): MediaSessionPlaybackState {
  switch (status) {
    case "playing":
    case "buffering":
      return "playing";
    case "paused":
    case "loading":
      return "paused";
    default:
      return "none";
  }
}

/**
 * Keeps the Media Session API in sync with whichever session owns the shared
 * embed: the personal queue, or radio while it's active.
 *
 * Radio has no skip/pause of its own (see radio/controller's doc comment), so
 * it registers metadata and playback state only, leaving every transport
 * button unwired/hidden rather than fighting the deterministic schedule.
 */
export function useMediaSessionSync(): void {
  useEffect(() => {
    function sync(): void {
      const radio = radioStore.get();
      const { status } = playerStore.get();

      if (radio.active) {
        setMediaSessionMetadata(radio.entry ? trackToMediaSession(entryToTrack(radio.entry)) : null);
        setMediaSessionHandlers({});
      } else {
        const track = queueStore.get().nowPlaying;
        setMediaSessionMetadata(track ? trackToMediaSession(track) : null);
        setMediaSessionHandlers({
          play: togglePlayPause,
          pause: togglePlayPause,
          previoustrack: playPrevious,
          nexttrack: playNext,
          seekto: seekTo,
        });
      }

      setMediaSessionPlaybackState(playbackStateFor(status));
    }

    sync();
    const unsubscribers = [
      playerStore.subscribe(sync),
      queueStore.subscribe(sync),
      radioStore.subscribe(sync),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);
}
