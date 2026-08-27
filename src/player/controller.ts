import { MAX_PLAYLIST_TRACKS } from "@/constants/player";
import { extractYouTubeId } from "@/lib/youtube/extractYouTubeId";
import { extractYouTubePlaylistId } from "@/lib/youtube/extractYouTubePlaylistId";
import { fetchTrack } from "@/lib/youtube/oembed";
import { loadLyricsFor } from "@/lyrics/lyricsStore";
import { resyncClock } from "./clock";
import {
  getCurrentTime,
  initEngine,
  load,
  onAdvanceRequested,
  pause,
  play,
  seek,
} from "./engine";
import { playerStore, setPlayerState } from "./playerStore";
import { resolvePlaylistVideoIds } from "./playlistResolver";
import {
  advance,
  enqueue,
  goBack,
  hydrateQueue,
  jumpTo,
  queueStore,
} from "./queueStore";
import type { Track } from "./types";

export type AddTrackResult =
  | { ok: true; kind: "track"; track: Track }
  | { ok: true; kind: "playlist"; added: number; total: number }
  | { ok: false; reason: "invalid-url" | "playlist-failed" };

let initPromise: Promise<void> | null = null;

/**
 * Boots the player and restores the saved session.
 *
 * The restored track is cued, not played: browsers refuse autoplay without a
 * prior user gesture, and a silently-rejected play() leaves the transport
 * showing "playing" over silence. Cueing loads the metadata so the duration and
 * artwork are right, and the first click starts audio.
 */
export function initPlayer(mount: HTMLElement): Promise<void> {
  if (initPromise) return initPromise;

  // Lyrics follow the queue rather than being fetched at each call site, so
  // every path that changes the track, advance, jump, restore, error skip,
  // gets them without remembering to ask.
  let lastTrackId: string | null = null;
  queueStore.subscribe(() => {
    const track = queueStore.get().nowPlaying;
    if (track?.id === lastTrackId) return;
    lastTrackId = track?.id ?? null;
    loadLyricsFor(track);
  });

  onAdvanceRequested(() => {
    const next = advance();
    if (next) {
      load(next.videoId, true);
    } else {
      setPlayerState({ status: "idle" });
    }
  });

  initPromise = (async () => {
    const [restored] = await Promise.all([hydrateQueue(), initEngine(mount)]);
    if (restored.nowPlaying) {
      load(restored.nowPlaying.videoId, false);
      setPlayerState({ status: "paused" });
    }
  })();

  return initPromise;
}

/**
 * Resolves metadata and appends to the queue, starting playback if idle.
 *
 * A playlist page URL adds every track it holds (capped at
 * `MAX_PLAYLIST_TRACKS`); anything else, including a video URL that also
 * carries a `list=` param, adds just that one video. See
 * `extractYouTubePlaylistId` for why the two are kept apart.
 */
export async function addTrackByUrl(url: string): Promise<AddTrackResult> {
  const playlistId = extractYouTubePlaylistId(url);
  if (playlistId) return addPlaylistById(playlistId);

  const videoId = extractYouTubeId(url);
  if (!videoId) return { ok: false, reason: "invalid-url" };

  const track = await fetchTrack(videoId, crypto.randomUUID());
  const wasEmpty = queueStore.get().nowPlaying === null;
  enqueue(track);

  // Adding to an idle player is an explicit user action, so it counts as the
  // gesture that unlocks autoplay.
  if (wasEmpty) playNext();

  return { ok: true, kind: "track", track };
}

async function addPlaylistById(playlistId: string): Promise<AddTrackResult> {
  let videoIds: string[];
  try {
    videoIds = await resolvePlaylistVideoIds(playlistId);
  } catch {
    return { ok: false, reason: "playlist-failed" };
  }

  const total = videoIds.length;
  const capped = videoIds.slice(0, MAX_PLAYLIST_TRACKS);
  const wasEmpty = queueStore.get().nowPlaying === null;

  const tracks = await Promise.all(
    capped.map((videoId) => fetchTrack(videoId, crypto.randomUUID())),
  );
  tracks.forEach(enqueue);

  if (wasEmpty) playNext();

  return { ok: true, kind: "playlist", added: tracks.length, total };
}

/** Pauses if currently playing or buffering, otherwise resumes. */
export function togglePlayPause(): void {
  const { status } = playerStore.get();
  if (status === "playing" || status === "buffering") {
    pause();
  } else {
    play();
  }
}

/** Advances the queue and loads the next track, or goes idle when it's empty. */
export function playNext(): void {
  const next = advance();
  if (next) {
    load(next.videoId, true);
  } else {
    setPlayerState({ status: "idle" });
  }
}

/**
 * Restarts the current track, or steps back if it just started.
 *
 * The convention every music player uses: "previous" within the first few
 * seconds means the previous track, later it means "start this one over".
 */
const RESTART_THRESHOLD_SECONDS = 3;

export function playPrevious(): void {
  if (getCurrentTime() > RESTART_THRESHOLD_SECONDS) {
    seekTo(0);
    return;
  }

  const previous = goBack();
  if (previous) load(previous.videoId, true);
}

/** Jumps to a specific queue entry and starts loading it. */
export function playTrack(trackId: string): void {
  const track = jumpTo(trackId);
  if (track) load(track.videoId, true);
}

export function seekTo(seconds: number): void {
  seek(seconds);
  // Without this the progress bar snaps back to the pre-seek position until
  // the next poll lands, up to 300 ms later.
  resyncClock();
}
