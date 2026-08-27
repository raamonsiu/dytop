import { PLAYLIST_RESOLVE_TIMEOUT_MS } from "@/constants/player";
import { loadYouTubeApi } from "./youtubeApi";

/**
 * Resolves a playlist id to its video ids.
 *
 * There is no keyless Data API for listing a playlist's contents, so the
 * IFrame API is repurposed instead: a throwaway, invisible player cues the
 * playlist and `getPlaylist()` reads back the ids it holds. The player is
 * never attached to the document's visible layout and destroys itself as
 * soon as it settles, on every path, so nothing outlives this call.
 */
export function resolvePlaylistVideoIds(playlistId: string): Promise<string[]> {
  return loadYouTubeApi().then(
    () =>
      new Promise<string[]>((resolve, reject) => {
        // Offscreen at 1x1 rather than display:none, matching PlayerHost: some
        // browsers treat a display:none embed as reason to throttle or refuse
        // it entirely.
        const host = document.createElement("div");
        host.style.position = "fixed";
        host.style.left = "-9999px";
        host.style.top = "-9999px";
        host.style.width = "1px";
        host.style.height = "1px";
        document.body.appendChild(host);

        let settled = false;
        const finish = (ids: string[] | null, error?: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          player.destroy();
          host.remove();
          if (ids) resolve(ids);
          else reject(error ?? new Error("Failed to resolve playlist"));
        };

        const timer = setTimeout(
          () => finish(null, new Error("Playlist resolve timed out")),
          PLAYLIST_RESOLVE_TIMEOUT_MS,
        );

        const player = new YT.Player(host, {
          height: "1",
          width: "1",
          playerVars: { listType: "playlist", list: playlistId },
          events: {
            onReady: () => {
              const ids = player.getPlaylist();
              if (Array.isArray(ids) && ids.length > 0) finish(ids);
              else finish(null, new Error("Playlist is empty or unavailable"));
            },
            onError: () => finish(null, new Error("Failed to load playlist")),
          },
        });
      }),
  );
}
