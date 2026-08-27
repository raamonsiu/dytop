import { useState } from "react";
import { useTransientMessage } from "@/lib/useTransientMessage";
import { useChromeHold } from "@/lib/useUiVisibility";
import { addTrackByUrl } from "@/player/controller";

interface AddSongFeedback {
  ok: boolean;
  key: string;
  /** i18n interpolation values, e.g. `{{count}}` for a playlist import. */
  params?: Record<string, number>;
}

/**
 * Shared state and submit handling for the "paste a YouTube URL" form.
 * Holds the chrome open while a URL is focused or non-empty, and reports the
 * outcome as a transient feedback message. Used by both the minimal and
 * legacy add-song inputs, which only differ in styling.
 */
export function useAddSongForm() {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState(false);
  const { message: feedback, show, clear } = useTransientMessage<AddSongFeedback>();

  useChromeHold(focused || url.trim().length > 0);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim() || pending) return;

    setPending(true);
    clear();
    const result = await addTrackByUrl(url);
    setPending(false);

    if (result.ok) {
      setUrl("");
      if (result.kind === "track") {
        show({ ok: true, key: "player.added" });
      } else if (result.added < result.total) {
        show({
          ok: true,
          key: "player.playlistTruncated",
          params: { count: result.added, total: result.total },
        });
      } else {
        show({ ok: true, key: "player.addedPlaylist", params: { count: result.added } });
      }
    } else {
      show({
        ok: false,
        key: result.reason === "playlist-failed" ? "errors.playlistFailed" : "errors.invalidUrl",
      });
    }
  }

  return { url, setUrl, pending, focused, setFocused, feedback, handleSubmit };
}
