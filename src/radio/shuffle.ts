/**
 * Daily-UTC deterministic shuffle.
 *
 * Radio derives the exact same (song, second) on every device from wall-clock
 * time alone, so the track order for a given UTC day must be a pure function of
 * that day, no network, no randomness source, no global state.
 */

/**
 * Turns a UTC day string into a stable integer seed.
 *
 * "2026-08-28" -> 20260828. Distinct days always produce distinct seeds, so
 * adjacent days get fresh (and almost always different) orders.
 */
export function dailySeed(utcDay: string): number {
  return Number(utcDay.replaceAll("-", ""));
}

/**
 * mulberry32 PRNG: a tiny, seeded, deterministic float generator in [0, 1).
 *
 * The full 32-bit state is derived from the seed once and mutated on every
 * call, which is what keeps the sequence stable for the same seed, the
 * property the golden-order test locks in.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * In-place Fisher–Yates using the given random source, operating on a copy so
 * the caller's array is never mutated.
 *
 * Durations must shuffle in lockstep with their track, so this works on
 * `[item, duration]` pairs rather than bare items, keeping each duration bound
 * to its track keeps the prefix-sum schedule valid.
 */
export function fisherYates<T>(items: T[], rand: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}
