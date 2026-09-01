import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { useNextUp } from "@/player/queueStore";

/** A small hint at what plays after the current track, or nothing at the end of the queue. */
export function NextUpIndicator({
  compact = false,
  overrideNext,
}: {
  compact?: boolean;
  /** Radio supplies its own "up next" (from the shared schedule) instead of the personal queue's. */
  overrideNext?: { title: string; author?: string } | null;
}) {
  const { t } = useTranslation();
  const queueNext = useNextUp();
  const next = overrideNext !== undefined ? overrideNext : queueNext;

  if (!next) return null;

  return (
    <p
      className={cn(
        "mt-1.5 truncate text-[11px] text-muted-foreground",
        // Follows the HUD: centred under the now-centred widget, left-aligned
        // and full-width under a stacked row.
        compact ? "px-1 text-left" : "max-w-56 text-center",
      )}
    >
      <span className="uppercase tracking-widest">{t("player.nextUp")}</span> {next.title}
      {next.author ? ` · ${next.author}` : ""}
    </p>
  );
}
