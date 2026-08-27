/**
 * Formats seconds as m:ss, or h:mm:ss past an hour.
 *
 * Guards against the non-finite values the player reports before metadata
 * lands: getDuration() answers 0 or NaN while a video is still loading, and
 * "NaN:NaN" in the HUD is worse than "0:00".
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const total = Math.floor(seconds);
  const secs = total % 60;
  const mins = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);

  const paddedSecs = String(secs).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

/** The HUD clock can show time left instead of elapsed; the leading minus is
 * part of the format, not a sign. */
export function formatRemaining(current: number, duration: number): string {
  if (!Number.isFinite(duration) || duration <= 0) return "0:00";
  return `-${formatTime(Math.max(0, duration - current))}`;
}
