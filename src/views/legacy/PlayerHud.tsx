import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { formatRemaining, formatTime } from "@/lib/format";
import { setPref, usePref } from "@/lib/prefs";
import { subscribeToTime } from "@/player/clock";
import { playNext, playPrevious, togglePlayPause } from "@/player/controller";
import { useIsPlaying } from "@/player/playerStore";
import { useNowPlaying } from "@/player/queueStore";

/**
 * Bottom-right transport and readout.
 *
 * The clock is a button: clicking it swaps elapsed for remaining, as in the
 * prototype. The choice persists, since it's a preference about how you read
 * time rather than a momentary peek.
 */
export function PlayerHud({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  const track = useNowPlaying();
  const isPlaying = useIsPlaying();
  const showRemaining = usePref("showRemainingTime");
  const timeRef = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      subscribeToTime(({ current, duration }) => {
        const node = timeRef.current;
        if (!node) return;
        node.textContent = duration
          ? `${showRemaining ? formatRemaining(current, duration) : formatTime(current)} / ${formatTime(duration)}`
          : formatTime(current);
      }),
    [showRemaining],
  );

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-view border border-glass-border bg-glass-strong px-4 py-3 backdrop-blur-xl transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
      // Hidden chrome must not be clickable or focusable, or tabbing would
      // land on invisible controls.
      inert={!visible}
    >
      <div className="flex items-center gap-1">
        <IconButton onClick={playPrevious} aria-label={t("player.previous")}>
          <SkipBack size={14} />
        </IconButton>
        <IconButton
          onClick={togglePlayPause}
          aria-label={t(isPlaying ? "player.pause" : "player.play")}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </IconButton>
        <IconButton onClick={playNext} aria-label={t("player.next")}>
          <SkipForward size={14} />
        </IconButton>
      </div>

      <div className="hidden min-w-0 max-w-56 sm:block">
        <p className="truncate text-xs" title={track?.title}>
          {track?.title ?? t("radio.nothingPlaying")}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{track?.author}</p>
      </div>

      <button
        type="button"
        onClick={() => setPref("showRemainingTime", !showRemaining)}
        aria-label={t("player.toggleTimeDisplay")}
        className="text-[11px] tabular-nums text-muted-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
      >
        <span ref={timeRef}>0:00</span>
      </button>
    </div>
  );
}
