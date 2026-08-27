import { useTranslation } from "react-i18next";
import { thumbnailUrl } from "@/constants/youtube";
import { cn } from "@/lib/cn";
import { playTrack } from "@/player/controller";
import { useHistory } from "@/player/queueStore";

/**
 * Recently played, newest first.
 *
 * Shared by both views because the data and the interaction are identical; only
 * the skin differs, which is what `rounded` carries: legacy is soft-cornered
 * and frosted, D1 is square and flat.
 */
export function HistoryList({ rounded = false }: { rounded?: boolean }) {
  const { t } = useTranslation();
  const history = useHistory();

  // Stored oldest-first, but the interesting end is the most recent.
  const entries = [...history].reverse();

  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("history.title")}
        </h1>
        {entries.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {t("history.count", { count: entries.length })}
          </span>
        ) : null}
      </div>

      <div aria-hidden className="pixel-divider mt-3 h-1 text-surface-border" />

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("history.empty")}</p>
      ) : (
        <ul className={cn("mt-4", rounded && "flex flex-col gap-2")}>
          {entries.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => playTrack(track.id)}
                className={cn(
                  "flex w-full items-center gap-4 py-3 text-left transition-colors hover:text-accent",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  rounded
                    ? "rounded-view border border-glass-border bg-glass px-3 backdrop-blur-md"
                    : "border-b border-surface-border",
                )}
              >
                <img
                  src={track.thumb}
                  alt=""
                  width={56}
                  height={40}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = thumbnailUrl(track.videoId);
                  }}
                  className={cn(
                    "h-10 w-14 shrink-0 object-cover",
                    rounded && "rounded-view",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{track.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {track.author}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
