import { useTranslation } from "react-i18next";
import { useNextUp } from "@/player/queueStore";

/** A one-line hint at what plays after the current track, or nothing at the end of the queue. */
export function NextUpIndicator({
  overrideNext,
}: {
  /** Radio supplies its own "up next" (from the shared schedule) instead of the personal queue's. */
  overrideNext?: { title: string; author?: string } | null;
} = {}) {
  const { t } = useTranslation();
  const queueNext = useNextUp();
  const next = overrideNext !== undefined ? overrideNext : queueNext;

  if (!next) return null;

  return (
    <p className="flex max-w-xl min-w-0 items-baseline gap-2 text-xs text-muted-foreground">
      <span className="shrink-0 uppercase tracking-widest">{t("player.nextUp")}</span>
      <span className="min-w-0 truncate">
        {next.title}
        {next.author ? ` · ${next.author}` : ""}
      </span>
    </p>
  );
}
