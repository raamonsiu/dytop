import { useTranslation } from "react-i18next";
import { LYRICS_DELAY_STEP_SECONDS, shiftLyricsDelay } from "@/constants/player";
import { cn } from "@/lib/cn";
import { setPref, usePref } from "@/lib/prefs";
import { useLyrics } from "@/lyrics/lyricsStore";

/**
 * Nudges lyric timing.
 *
 * Community-timed lyrics are often offset from a given upload: a video with a
 * few seconds of intro throws every line out by the same amount, so the fix is
 * a constant shift rather than anything per-line.
 *
 * Hidden unless synced lyrics are actually showing: there is nothing to shift
 * otherwise, and the minimal view earns its name by not rendering dead
 * controls.
 */
export function LyricsDelayControl() {
  const { t } = useTranslation();
  const lyrics = useLyrics();
  const delay = usePref("lyricsDelay");

  if (lyrics.status !== "synced") return null;

  const shift = (amount: number) => setPref("lyricsDelay", shiftLyricsDelay(delay, amount));

  const buttonClasses =
    "px-1 transition-colors hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent";

  return (
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
      <button
        type="button"
        onClick={() => shift(-LYRICS_DELAY_STEP_SECONDS)}
        aria-label={t("lyrics.later")}
        className={buttonClasses}
      >
        −
      </button>
      <span
        aria-label={t("lyrics.delay")}
        className={cn("tabular-nums", delay !== 0 && "text-accent")}
      >
        {delay > 0 ? "+" : ""}
        {delay.toFixed(2)}s
      </span>
      <button
        type="button"
        onClick={() => shift(LYRICS_DELAY_STEP_SECONDS)}
        aria-label={t("lyrics.earlier")}
        className={buttonClasses}
      >
        +
      </button>
    </div>
  );
}
