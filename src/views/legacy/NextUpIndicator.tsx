import { useTranslation } from "react-i18next";
import { useNextUp } from "@/player/queueStore";

/** A small hint at what plays after the current track, or nothing at the end of the queue. */
export function NextUpIndicator() {
  const { t } = useTranslation();
  const next = useNextUp();

  if (!next) return null;

  return (
    <p className="mt-1.5 max-w-56 truncate text-right text-[11px] text-muted-foreground">
      <span className="uppercase tracking-widest">{t("player.nextUp")}</span> {next.title}
      {next.author ? ` · ${next.author}` : ""}
    </p>
  );
}
