import { useTranslation } from "react-i18next";
import { thumbnailUrl } from "@/constants/youtube";
import { playTrack } from "@/player/controller";
import { useHistory } from "@/player/queueStore";

export function HistoryView() {
  const { t } = useTranslation();
  const history = useHistory();

  // Stored oldest-first, but the interesting end is the most recent.
  const entries = [...history].reverse();

  return (
    <section className="mx-auto h-full w-full max-w-2xl overflow-y-auto px-6 pb-10">
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
        <ul className="mt-4">
          {entries.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => playTrack(track.id)}
                className="flex w-full items-center gap-4 border-b border-surface-border py-3 text-left transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
                  className="h-10 w-14 shrink-0 object-cover"
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
    </section>
  );
}
