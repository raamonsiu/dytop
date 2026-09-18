/**
 * Radio position, the pure bridge between wall-clock time and the embed.
 *
 * Everything here is a pure function of an epoch second: the UTC day, the
 * deterministic slot for that instant, and the queue-track the view should
 * render. Keeping it pure is what lets it live in the co-located unit tests;
 * the impure controller calls these and applies the engine side effects.
 */
import { thumbnailUrl } from "@/constants/youtube";
import { artistFromChannel, parseTitleGuess } from "@/lib/youtube/parseTitleGuess";
import type { Track } from "@/player/types";
import {
  DEFAULT_RADIO_STATION,
  RADIO_STATIONS,
  type RadioManifestEntry,
  type RadioStationId,
} from "./manifest";
import { dailySchedule, positionAt } from "./schedule";

/** The UTC calendar day containing the given epoch second, as "YYYY-MM-DD".
 *
 * Dates are derived in UTC so two clients with correct clocks, whatever their
 * timezones, always agree on the day and therefore on the shuffle seed.
 */
export function utcDayString(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface RadioSlot {  /** The effective entry (blocked slots already substituted) for this instant. */
  entry: RadioManifestEntry;
  /** Second within the entry. */
  offsetInTrack: number;
  /** The UTC day whose schedule produced the slot. */
  day: string;
  /** True when the slot no longer matches the currently loaded video. */
  changed: boolean;
  /** True when `entry` is itself known-refused, i.e. the station fallback has
   * failed too and there is nothing left to substitute. The controller stops
   * re-asserting playback rather than spinning on it until the slot moves. */
  unavailable: boolean;
}

/** No video known-refused: the default for callers that don't track them. */
const NONE: ReadonlySet<string> = new Set();

/**
 * Swaps an entry the embed refused at runtime for the station fallback.
 *
 * The maintainer-confirmed `blocked` flag is substituted at schedule build
 * (see `dailySchedule`), but a video can start refusing embeds long before
 * anyone gets round to marking it. Those failures are discovered per-session
 * by the controller and substituted here instead, on the same slot and the
 * same offset: the loop keeps its wall-clock shape, so a client that never hit
 * the failure stays in sync second for second.
 */
function substitute(
  entry: RadioManifestEntry,
  stationId: RadioStationId,
  unavailable: ReadonlySet<string>,
): RadioManifestEntry {
  if (!unavailable.has(entry.videoId)) return entry;
  return RADIO_STATIONS[stationId].fallback;
}

/**
 * Resolves the deterministic slot for an epoch second against the video the
 * embed is currently showing.
 *
 * `changed` is the play/integrity signal: when it is true the controller must
 * load the new slot and seek, when false the embed is already correct and a
 * heal is a no-op (this is what keeps the controller from being a correction
 * loop — it only re-loads when the deterministic position actually moved).
 */
export function radioSlotAt(
  epochSec: number,
  loadedVideoId: string | null,
  stationId: RadioStationId = DEFAULT_RADIO_STATION,
  unavailable: ReadonlySet<string> = NONE,
): RadioSlot {
  const day = utcDayString(epochSec);
  const schedule = dailySchedule(day, stationId);
  const { entry, offsetInTrack } = positionAt(schedule, epochSec);
  const effective = substitute(entry, stationId, unavailable);
  return {
    entry: effective,
    offsetInTrack,
    day,
    // Compared against the effective entry, so substituting a refused video is
    // itself a change the controller must load.
    changed: effective.videoId !== loadedVideoId,
    unavailable: unavailable.has(effective.videoId),
  };
}

/**
 * The entry deterministically scheduled after the one playing at `epochSec`,
 * wrapping from the end of the loop back to the first entry. Used for the
 * "up next" hint in the radio UI.
 *
 * Uses `positionAt`'s own `index` rather than re-finding the current entry by
 * videoId: more than one blocked slot substitutes the identical RADIO_FALLBACK
 * entry, so a videoId lookup would always land on the first such slot instead
 * of whichever one is actually playing.
 */
export function upNextEntry(
  epochSec: number,
  stationId: RadioStationId = DEFAULT_RADIO_STATION,
  unavailable: ReadonlySet<string> = NONE,
): RadioManifestEntry {
  const day = utcDayString(epochSec);
  const schedule = dailySchedule(day, stationId);
  const { index } = positionAt(schedule, epochSec);
  const next = schedule.order[(index + 1) % schedule.order.length];
  // Substituted like the current slot, so the hint names what will actually
  // play rather than the video this client already knows is refused.
  return substitute(next ?? schedule.order[0]!, stationId, unavailable);
}

/**
 * Maps a manifest entry to the queue `Track` shape so the shared lyrics
 * pipeline works on radio for free. The id is the videoId: radio schedules each
 * effective track at most once per loop, so it is unique within the loop.
 */
export function entryToTrack(entry: RadioManifestEntry): Track {
  const { artist, title } = parseTitleGuess(entry.title);
  return {
    id: entry.videoId,
    videoId: entry.videoId,
    title: entry.title,
    author: entry.author,
    thumb: thumbnailUrl(entry.videoId),
    artistGuess: artist || artistFromChannel(entry.author),
    titleGuess: title || entry.title,
  };
}
