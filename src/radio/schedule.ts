/**
 * Daily radio schedule, pure functions mapping a UTC day and an epoch second
 * to a (song, second) position.
 *
 * The only contract the controller trusts: for the same UTC day every client
 * derives the identical schedule and position, so the entire app stays in sync
 * from wall-clock time alone.
 */
import {
  DEFAULT_RADIO_STATION,
  RADIO_STATIONS,
  type RadioManifestEntry,
  type RadioStationId,
} from "./manifest";
import { dailySeed, fisherYates, mulberry32 } from "./shuffle";

/** A fully-built radio loop for one UTC day. */
export interface Schedule {
  /** Effective play order (blocked slots already substituted). */
  order: RadioManifestEntry[];
  /** Cumulative durations in seconds, one per entry, always ascending. */
  prefixSums: number[];
  /** Total loop length in seconds; `offset mod totalSec` selects a position. */
  totalSec: number;
}

/** One cached schedule per (station, day): rebuilding is deterministic, so a
 * repeat call for the same key always returns the exact same value, and the
 * controller's 1s tick would otherwise reshuffle the whole manifest every
 * second (plus again for `upNextEntry`) purely to reconfirm nothing changed.
 * Grows by at most one entry per station per calendar day — never evicted,
 * since that's negligible even across a very long-lived tab. */
const scheduleCache = new Map<string, Schedule>();

/**
 * Builds the deterministic one-day schedule.
 *
 * 1. Seed the PRNG from the UTC day and shuffle `[entry, duration]` pairs so
 *    durations travel with their track (keeps prefix sums valid).
 * 2. Substitute any blocked slot with the single global `RADIO_FALLBACK` and
 *    recompute total depth. Substitution happens here, so every caller sees the
 *    same, already-finalized schedule.
 */
export function dailySchedule(
  utcDay: string,
  stationId: RadioStationId = DEFAULT_RADIO_STATION,
): Schedule {
  const cacheKey = `${stationId}:${utcDay}`;
  const cached = scheduleCache.get(cacheKey);
  if (cached) return cached;

  const station = RADIO_STATIONS[stationId];
  const rand = mulberry32(dailySeed(utcDay));
  const pairs = station.manifest.map(
    (entry) => [entry, entry.durationSec] as [RadioManifestEntry, number],
  );
  const order = fisherYates(pairs, rand).map(([entry]) => entry);

  const substituted = order.map((entry) => (entry.blocked ? station.fallback : entry));

  const prefixSums: number[] = [];
  let totalSec = 0;
  for (const entry of substituted) {
    totalSec += entry.durationSec;
    prefixSums.push(totalSec);
  }

  const schedule: Schedule = { order: substituted, prefixSums, totalSec };
  scheduleCache.set(cacheKey, schedule);
  return schedule;
}

/** floored modulo, so negative epoch seconds wrap into [0, total) like Java. */
function floorMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Maps an epoch second to the song playing at that instant and the second
 * within that song, binary-searching the prefix sums.
 *
 * An empty or degenerate schedule resolves to a safe fallback (first track, or
 * the global RADIO_FALLBACK) at second 0, it never throws.
 *
 * `index` is the position within `schedule.order`, not just the entry: two
 * blocked slots both substitute the same RADIO_FALLBACK object, so matching
 * "the current entry" back to a slot by videoId alone (e.g. to find what's
 * next) would collide on the first occurrence. Callers that need "what comes
 * after this instant" should use `index`, not re-derive it from videoId.
 */
export function positionAt(
  s: Schedule,
  epochSec: number,
): { entry: RadioManifestEntry; offsetInTrack: number; index: number } {
  const total = s.totalSec;
  if (total <= 0 || s.prefixSums.length === 0 || s.order.length === 0) {
    return {
      entry: s.order[0] ?? RADIO_STATIONS[DEFAULT_RADIO_STATION].fallback,
      offsetInTrack: 0,
      index: 0,
    };
  }

  const offset = floorMod(epochSec, total);

  let lo = 0;
  let hi = s.prefixSums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (s.prefixSums[mid]! > offset) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  const index = lo;
  const entry = s.order[index]!;
  const before = index === 0 ? 0 : s.prefixSums[index - 1]!;
  return { entry, offsetInTrack: offset - before, index };
}
