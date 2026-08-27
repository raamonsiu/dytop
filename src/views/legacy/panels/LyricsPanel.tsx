import { useTranslation } from "react-i18next";
import { LYRICS_DELAY_STEP_SECONDS, shiftLyricsDelay } from "@/constants/player";
import { cn } from "@/lib/cn";
import { setPref, usePref } from "@/lib/prefs";

/**
 * Lyrics visibility and sync offset.
 *
 * Community-timed lyrics are frequently offset from a given upload by a
 * constant amount: an intro of a few seconds throws every line out equally,
 * so a single shift is the right correction.
 */
export function LyricsPanel() {
  const { t } = useTranslation();
  const visible = usePref("lyricsVisible");
  const delay = usePref("lyricsDelay");

  const shift = (amount: number) => setPref("lyricsDelay", shiftLyricsDelay(delay, amount));

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center justify-between gap-4 text-xs">
        <span>{t("legacy.showLyrics")}</span>
        <input
          type="checkbox"
          checked={visible}
          onChange={(event) => setPref("lyricsVisible", event.target.checked)}
          className="size-4 accent-[var(--accent)]"
        />
      </label>

      <div className="flex items-center justify-between gap-4 text-xs">
        <span>{t("lyrics.delay")}</span>
        <div className="flex items-center gap-2">
          <StepButton onClick={() => shift(-LYRICS_DELAY_STEP_SECONDS)} label={t("lyrics.later")}>
            −
          </StepButton>
          <span className={cn("w-16 text-center tabular-nums", delay !== 0 && "text-accent")}>
            {delay > 0 ? "+" : ""}
            {delay.toFixed(2)}s
          </span>
          <StepButton onClick={() => shift(LYRICS_DELAY_STEP_SECONDS)} label={t("lyrics.earlier")}>
            +
          </StepButton>
        </div>
      </div>
    </div>
  );
}

function StepButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-6 place-items-center rounded-view border border-glass-border transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
    >
      {children}
    </button>
  );
}
