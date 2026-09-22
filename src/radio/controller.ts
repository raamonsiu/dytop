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
  type AdvanceReason,
  getAdvanceHandler,
  getCurrentTime,
  hasUserInteracted,
  load,
  onAdvanceRequested,
  pause,
  play,
  seek,
} from "@/player/engine";
import { isPlaying } from "@/player/playerStore";
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
  if (!isPlaying()) play();
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
 * Videos this browser has seen the embed refuse, for the rest of the page's
 * life.
 *
 * The manifest's `blocked` flag is hand-maintained, and a video routinely
 * starts refusing embeds (taken down, region-locked, embedding disabled) long
 * before anyone marks it. Without this the deterministic schedule keeps naming
 * the refused video for its whole slot: every heal re-asserts it, the embed
 * errors again, and radio spends up to a full track looping on the failure.
 * Remembering it lets `radioSlotAt` substitute the station fallback on the
 * spot, and the next slot rejoins the shared schedule untouched.
 *
 * Deliberately not persisted, and not cleared by `stopRadio`: it describes
 * what this browser can play, which outlives one radio session but nothing
 * more — a reload gives every video another chance.
 */
const unavailableVideos = new Set<string>();

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
 *
 * `slot.unavailable` means even the substituted entry is known-refused, so
 * the station fallback itself has failed and there is nothing playable for
 * this slot. Re-seeking and resuming would only re-trigger the error that got
 * us here, so the embed is left alone and the tick picks the next slot up.
 */
function refreshSlot(): void {
  // One reading of the clock for the slot and the hint alike: taken twice, a
  // tick that lands on a boundary second resolves them from different instants
  // and the hint names the track that just started playing.
  const now = epochNow();
  const slot = radioSlotAt(now, loadedSlot?.videoId ?? null, stationId, unavailableVideos);
  if (slot.changed) {
    load(slot.entry.videoId, unlocked, slot.offsetInTrack);
  } else if (!slot.unavailable) {
    seek(slot.offsetInTrack);
  }
  if (unlocked && !slot.unavailable) ensurePlaying();
  loadedSlot = { videoId: slot.entry.videoId, day: slot.day, index: slot.index };
  loadLyricsFor(entryToTrack(slot.entry));
  radioStore.set({
    active: true,
    stationId,
    entry: slot.entry,
    offsetInTrack: slot.offsetInTrack,
    next: upNextEntry(now, stationId, unavailableVideos),
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
 *
 * A refusal is the one reason that must not be debounced; see the body.
 */
function heal(reason?: AdvanceReason): void {
  if (!active) return;

  if (reason?.kind === "refused") {
    // Deliberately ahead of the debounce, and not subject to it. A refusal is
    // a one-shot fact that arrives exactly once, where the debounce exists for
    // a repeating storm; collapsing it into the previous second would leave
    // the slot silent on a video the embed has already rejected until the next
    // boundary, minutes away.
    unavailableVideos.add(reason.videoId);
    lastHealEpoch = epochNow();
    refreshSlot();
    return;
  }

  const now = epochNow();
  if (now === lastHealEpoch) return;
  lastHealEpoch = now;
  refreshSlot();
}

let active = false;
let stationId: RadioStationId = DEFAULT_RADIO_STATION;
let savedAdvanceHandler: ((reason: AdvanceReason) => void) | null = null;
/** Where the personal queue stood when radio took the embed over, restored by
 * `runStop`. `wasPlaying` is the part that decides between resuming it and
 * merely cueing it back: a queue that was only ever restored-and-cued must not
 * come back playing just because the user looked at the radio tab. */
let savedQueuePosition:
  | { videoId: string; positionSec: number; wasPlaying: boolean }
  | null = null;
/**
 * Where the embed currently stands, or null while radio holds nothing.
 *
 * All three fields answer different questions and none is derivable from the
 * others: `videoId` is what `radioSlotAt` compares against to decide whether a
 * load is needed at all, while `day` and `index` together are the only way the
 * tick can tell that the deterministic position moved — two substituted slots
 * in a row carry the same entry, so the videoId does not change across that
 * boundary (see `RadioSlot.index`).
 */
let loadedSlot: { videoId: string; day: string; index: number } | null = null;
let tickId: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;

/**
 * Guards against the legacy/minimal radio views' stop/start pair from
 * stuttering the embed when a view switch swaps `LegacyRadioView` for
 * `RadioView` (or back) while radio is already playing: React unmounts the
 * old leaf route and mounts the new one for the same `/radio` session in the
 * same commit, calling this module's `stopRadio()` immediately followed by
 * `startRadio()`. Without this, `stopRadio()` would pause the embed and drop
 * `loadedVideoId`, making the immediate `startRadio()` see a "changed" slot
 * for the *same* video and reload it — an audible stutter for no real state
 * change. Deferring the teardown to a microtask lets the paired `startRadio()`
 * cancel it outright when it runs first.
 */
let pendingStop: Promise<void> | null = null;

function scheduleTick(): void {
  if (tickId) return;
  tickId = setInterval(() => {
    if (!active) return;
    const slot = radioSlotAt(epochNow(), loadedSlot?.videoId ?? null, stationId, unavailableVideos);
    // Only act when the deterministic position moved (new slot or new day) —
    // this catches an ENDED event that never fired and the 00:00 UTC reseed.
    if (slot.index !== loadedSlot?.index || slot.day !== loadedSlot.day) {
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
  // A stop/start pair from a legacy/minimal view swap (see `pendingStop`):
  // cancel the deferred teardown and keep the embed exactly as it was,
  // instead of tearing down and immediately re-loading the same slot.
  if (pendingStop) {
    pendingStop = null;
    retune(id);
    return;
  }

  if (active) {
    retune(id);
    return;
  }

  active = true;
  stationId = id;
  // Already interacted with the app before landing on /radio (clicked a nav
  // link, pressed play elsewhere, ...): the browser already allows unmuted
  // playback, so skip straight to it instead of gating on another tap.
  unlocked = hasUserInteracted();

  const now = queueStore.get().nowPlaying;
  savedQueuePosition = now
    ? { videoId: now.videoId, positionSec: getCurrentTime(), wasPlaying: isPlaying() }
    : null;
  savedAdvanceHandler = getAdvanceHandler() ?? (() => {});
  onAdvanceRequested(heal);

  visibilityHandler = onVisibilityChange;
  document.addEventListener("visibilitychange", visibilityHandler);

  scheduleTick();
  refreshSlot();
}

/**
 * Points an already-running session at another station.
 *
 * Deliberately not a stop followed by a start: the personal-queue snapshot and
 * the swapped advance handler belong to the radio *session*, not to one
 * station, and tearing them down would re-assert the queue track on the embed
 * only to load the new slot over it a moment later — with `getCurrentTime()`
 * read mid-load, the restored position would be the radio offset rather than
 * the queue's. Only the schedule the slot comes from changes here.
 *
 * Asking for the station already playing is the common case (every view swap),
 * and is a no-op rather than a reload. So is asking while nothing is playing:
 * the station a future session starts on is the caller's stored preference,
 * not state this module keeps.
 */
export function retune(id: RadioStationId): void {
  if (!active || id === stationId) return;
  stationId = id;
  // Forget where we were so the new station's slot reads as a change.
  loadedSlot = null;
  refreshSlot();
}

/**
 * Exits radio mode and restores the personal queue's track, position and
 * playing/paused state.
 *
 * Restores the queue's advance handler, then re-asserts the captured track.
 * A queue that was merely cued when radio started (the usual case on a fresh
 * load: `initPlayer` restores the session without playing it) comes back cued,
 * not playing — leaving radio is not a request to start the personal queue.
 * With no captured track at all the embed is simply paused.
 */
export function stopRadio(): void {
  if (!active) return;

  // Deferred by one microtask so a same-tick `startRadio()` — the
  // legacy/minimal view swap case — can cancel this before any of it runs.
  // A genuine "leave radio" (navigating to the player/history tab) has no
  // such follow-up call, so it proceeds on the next microtask exactly as
  // before, just one tick later than an unavoidably imperceptible delay.
  const stop = Promise.resolve().then(() => {
    if (pendingStop !== stop) return;
    pendingStop = null;
    runStop();
  });
  pendingStop = stop;
}

function runStop(): void {
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
    const { videoId, positionSec, wasPlaying } = savedQueuePosition;
    load(videoId, wasPlaying, positionSec);
    loadLyricsFor(queueStore.get().nowPlaying);
  } else {
    pause();
  }

  loadedSlot = null;
  savedQueuePosition = null;
  stationId = DEFAULT_RADIO_STATION;
  radioStore.set(IDLE);
}

/** Subscribes a component to the full radio state (entry, status, offset). */
export function useRadio(): RadioState {
  return useStoreSelector(radioStore, (state) => state);
}
