import { Pause, Play, SkipForward } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/IconButton";
import { thumbnailUrl } from "@/constants/youtube";
import { playNext, togglePlayPause } from "@/player/controller";
import { useIsPlaying } from "@/player/playerStore";
import type { Track } from "@/player/types";
import { LinearProgress } from "./LinearProgress";
import { LyricsDelayControl } from "./LyricsDelayControl";

export function NowPlayingCard({ track }: { track: Track }) {
  const { t } = useTranslation();
  const isPlaying = useIsPlaying();

  return (
    <article className="flex w-full max-w-xl gap-5 border border-surface-border bg-surface/80 p-5 backdrop-blur-md">
      <img
        src={track.thumb}
        alt=""
        width={96}
        height={96}
        loading="lazy"
        // oEmbed hands back a thumbnail URL that can 404 for age-restricted or
        // recently-changed videos; the id-derived one always resolves.
        onError={(event) => {
          event.currentTarget.src = thumbnailUrl(track.videoId);
        }}
        className="size-24 shrink-0 object-cover"
      />

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm" title={track.title}>
            {track.title}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{track.author}</p>
        </div>

        <LinearProgress />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
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
          <LyricsDelayControl />
        </div>
      </div>
    </article>
  );
}
