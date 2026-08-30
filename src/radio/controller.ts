/**
 * Radio controller: the only impure radio module.
 *
 * Everything here reaches into the shared YouTube embed (via `src/player/engine`)
 * and takes over its queue-advance handler for the duration of a radio session.
 * All *decisions* are made by the pure `radioSlotAt` bridge, so this module is
 * deliberately thin: it turns "which slot, do we need to load it" into
 * load/seek/play calls on the one embed the PlayerHost owns.
 *
 * Handoff contract: radio never writes to `queueStore`. On start it captures
 * the personal queue's position; on stop it restores that track and position,
 * so returning to the player picks up exactly where it left off.
 */
import { createStore, useStoreSelector } from "@/lib/createStore";
import { loadLyricsFor } from "@/lyrics/lyricsStore";
import {
  getAdvanceHandler,
  getCurrentTime,
  hasUserInteracted,
  load,
  onAdvanceRequested,
  pause,
  play,
  seek,
} from "@/player/engine";
import { playerStore, setPlayerState } from "@/player/playerStore";
import { queueStore } from "@/player/queueStore";
import { DEFAULT_RADIO_STATION, type RadioManifestEntry, type RadioStationId } from "./manifest";
import { entryToTrack, radioSlotAt, upNextEntry } from "./position";

export interface RadioState {
  active: boolean;
  /** Which station is playing, or null when idle. */
  stationId: RadioStationId | null;
  /** The deterministic manifest entry currently scheduled, for the UI. */
  entry: RadioManifestEntry | null;
  /** Second within `entry`. */
  offsetInTrack: number;
  /** The entry deterministically scheduled after `entry`, for the UI. */
  next: RadioManifestEntry | null;
  /** The videoId the embed was last told to load, for change detection. */
  loadedVideoId: string | null;
  /** UTC day whose schedule produced the current slot (midnight continuity). */
  day: string | null;
  /** True while the slot is loaded but waiting on a user gesture to play
   * audibly (see `unlockRadioPlayback`). */
  needsGesture: boolean;
}

const IDLE: RadioState = {
  active: false,
  stationId: null,
  entry: null,
  offsetInTrack: 0,
  next: null,
  loadedVideoId: null,
  day: null,
  needsGesture: false,
};

/** How often the controller re-checks the deterministic slot for boundary or
 * midnight changes. This is intentionally NOT a correction loop: heal only
 * re-loads/re-seeks when the slot actually moved, never to trim drift against
 * the embed clock (NTP-only, per design D6). */
const RADIO_TICK_MS = 1_000;

export const radioStore = createStore<RadioState>(IDLE);

function epochNow(): number {
  return Math.floor(Date.now() / 1000);
}

function ensurePlaying(): void {
  const { status } = playerStore.get();
  if (status !== "playing" && status !== "buffering") play();
}

/**
 * Whether audible playback is unlocked for this radio session: either the
 * page had already seen a user interaction by the time `startRadio` ran (see
 * `hasUserInteracted`), or `unlockRadioPlayback` has since run inside one.
 * Entering `/radio` is just a route mount, not itself a gesture — the same
 * reason `initPlayer` cues the restored queue track instead of playing it
 * (see `player/controller.ts`) applies here on a genuinely fresh load. Until
 * unlocked, slots are cued silently rather than played: requesting unmuted
 * autoplay without any prior interaction is silently rejected by the
 * browser, which left the embed paused forever with nothing to recover it —
 * the "stuck on one second, no sound" bug.
 */
let unlocked = false;

/**
 * Recomputes the deterministic slot and drives the embed to it.
 *
 * This is the single heal body: used by start, the advance-handler (track
 * boundary / blocked error), the midnight tick, and the refocus listener. It
 * loads only when the slot changed, re-seeks to the deterministic position,
 * resumes playback if paused, and keeps the UI + lyrics in sync.
 *
 * A video change starts the load already at `slot.offsetInTrack` (via
 * `load`'s `startSeconds`) rather than loading at 0 and seeking after: a
 * `seek()` right after `load()` races the embed's own async load and is
 * frequently ignored, which is what made a fresh page load (or a refresh)
 * always restart the current track from 0:00 instead of joining mid-song.
 * When the video hasn't changed the embed is already loaded, so a direct
 * `seek()` is reliable (used for the midnight/refocus re-sync case).
 *
 * While `unlocked` is false, the slot is cued (not played) instead, exactly
 * like a restored personal-queue track: audio starts only once
 * `unlockRadioPlayback` runs inside a real click.
 */
function refreshSlot(): void {
  const slot = radioSlotAt(epochNow(), loadedVideoId, stationId);
  if (slot.changed) {
    loadedVideoId = slot.entry.videoId;
    load(slot.entry.videoId, unlocked, slot.offsetInTrack);
    if (!unlocked) setPlayerState({ status: "paused" });
  } else {
    seek(slot.offsetInTrack);
  }
  if (unlocked) ensurePlaying();
  loadLyricsFor(entryToTrack(slot.entry));
  radioStore.set({
    active: true,
    stationId,
    entry: slot.entry,
    offsetInTrack: slot.offsetInTrack,
    next: upNextEntry(epochNow(), stationId),
    loadedVideoId,
    day: slot.day,
    needsGesture: !unlocked,
  });
}

/**
 * Unlocks audible playback. Call this from the click handler on the
 * "tap to listen" prompt shown while `needsGesture` is true — nothing else
 * can legally start unmuted audio, since only a call made synchronously
 * inside a real user gesture satisfies the browser's autoplay policy.
 */
export function unlockRadioPlayback(): void {
  if (!active || unlocked) return;
  unlocked = true;
  refreshSlot();
}

/** Last epoch second a heal actually ran, so a heal storm collapses to one
 * per second (see `heal`'s doc comment). */
let lastHealEpoch = 0;

/**
 * Playback-integrity heal on track boundary / blocked error / refocus.
 *
 * Debounced to once per wall-clock second. Manifest durations are hand-
 * verified approximations (see manifest.ts); if one overstates a video's real
 * length, the embed fires ENDED before the deterministic schedule agrees the
 * slot has moved, so `refreshSlot` re-seeks the same (already-ended) video
 * near its own end and resumes it — which can immediately re-fire ENDED and
 * repeat, stuttering in a tight loop until wall-clock time finally reaches the
 * declared boundary. Capping heals to one per second turns that into a single
 * harmless re-seek followed by a quiet wait, at a granularity nothing in this
 * module (or the UI) can perceive anyway — the tick loop itself only runs
 * once a second.
 */
function heal(): void {
  if (!active) return;
  const now = epochNow();
  if (now === lastHealEpoch) return;
  lastHealEpoch = now;
  refreshSlot();
}

let active = false;
let stationId: RadioStationId = DEFAULT_RADIO_STATION;
let savedAdvanceHandler: (() => void) | null = null;
let savedQueuePosition: { videoId: string; positionSec: number } | null = null;
let loadedVideoId: string | null = null;
let tickId: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;

function scheduleTick(): void {
  if (tickId) return;
  tickId = setInterval(() => {
    if (!active) return;
    const slot = radioSlotAt(epochNow(), loadedVideoId, stationId);
    const state = radioStore.get();
    // Only act when the deterministic position moved (new track or new day) —
    // this catches an ENDED event that never fired and the 00:00 UTC reseed.
    if (slot.entry.videoId !== loadedVideoId || slot.day !== state.day) {
      refreshSlot();
    }
  }, RADIO_TICK_MS);
}

function onVisibilityChange(): void {
  // Refocusing the tab is an explicit integrity point: the embed may have been
  // throttled in the background, so re-seek to the deterministic position.
  if (document.visibilityState === "visible") heal();
}

/**
 * Enters radio mode over the shared embed.
 *
 * Captures the personal queue's position and swaps the engine's advance
 * handler (so ending a radio track re-seeks to the next radio slot instead of
 * advancing the private queue). Mounting is not itself a user gesture, so the
 * initial slot is only cued; see `unlockRadioPlayback` for what starts audio.
 */
export function startRadio(id: RadioStationId = DEFAULT_RADIO_STATION): void {
  if (active) return;
  active = true;
  stationId = id;
  // Already interacted with the app before landing on /radio (clicked a nav
  // link, pressed play elsewhere, ...): the browser already allows unmuted
  // playback, so skip straight to it instead of gating on another tap.
  unlocked = hasUserInteracted();

  const now = queueStore.get().nowPlaying;
  savedQueuePosition = now
    ? { videoId: now.videoId, positionSec: getCurrentTime() }
    : null;
  savedAdvanceHandler = getAdvanceHandler() ?? (() => {});
  onAdvanceRequested(heal);

  visibilityHandler = onVisibilityChange;
  document.addEventListener("visibilitychange", visibilityHandler);

  scheduleTick();
  refreshSlot();
}

/**
 * Exits radio mode and restores the personal queue's track and position.
 *
 * Restores the queue's advance handler, then re-asserts the captured track
 * (load + seek). If nothing was playing before radio, the embed is paused so
 * it does not keep autoplaying unattended.
 */
export function stopRadio(): void {
  if (!active) return;
  active = false;

  if (tickId) {
    clearInterval(tickId);
    tickId = null;
  }
  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }

  onAdvanceRequested(savedAdvanceHandler ?? (() => {}));
  savedAdvanceHandler = null;

  if (savedQueuePosition) {
    load(savedQueuePosition.videoId, true, savedQueuePosition.positionSec);
    loadLyricsFor(queueStore.get().nowPlaying);
  } else {
    pause();
  }

  loadedVideoId = null;
  savedQueuePosition = null;
  stationId = DEFAULT_RADIO_STATION;
  radioStore.set(IDLE);
}

/** Subscribes a component to the full radio state (entry, status, offset). */
export function useRadio(): RadioState {
  return useStoreSelector(radioStore, (state) => state);
}
