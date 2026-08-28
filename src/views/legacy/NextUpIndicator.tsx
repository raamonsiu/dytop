import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { useNextUp } from "@/player/queueStore";

/** A small hint at what plays after the current track, or nothing at the end of the queue. */
export function NextUpIndicator({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const next = useNextUp();

  if (!next) return null;

  return (
    <p
      className={cn(
        "mt-1.5 truncate text-[11px] text-muted-foreground",
        // Follows the HUD: right-aligned under a corner widget, left-aligned
        // and full-width under a stacked row.
        compact ? "px-1 text-left" : "max-w-56 text-right",
      )}
    >
      <span className="uppercase tracking-widest">{t("player.nextUp")}</span> {next.title}
      {next.author ? ` · ${next.author}` : ""}
    </p>
  );
}
