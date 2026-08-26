import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useTransientMessage } from "@/lib/useTransientMessage";
import { addTrackByUrl } from "@/player/controller";

interface Feedback {
  kind: "ok" | "error";
  key: string;
}

/**
 * The only way tracks enter the app: paste a YouTube URL.
 *
 * No search box, because searching needs the Data API, which needs a key,
 * which in a static SPA means shipping that key in the bundle. oEmbed covers
 * metadata without either.
 */
export function AddSongInline() {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const { message: feedback, show, clear } = useTransientMessage<Feedback>();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim() || pending) return;

    setPending(true);
    clear();
    const result = await addTrackByUrl(url);
    setPending(false);

    if (result.ok) {
      setUrl("");
      show({ kind: "ok", key: "player.added" });
    } else {
      show({ kind: "error", key: "errors.invalidUrl" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={t("player.pasteUrl")}
          aria-label={t("player.pasteUrl")}
          className={cn(
            "min-w-0 flex-1 border border-surface-border bg-surface px-3 py-2 text-xs",
            "outline-none placeholder:text-muted-foreground focus-visible:border-accent",
            "short:py-1",
          )}
        />
        <Button type="submit" variant="primary" disabled={pending}>
          {t(pending ? "player.adding" : "player.add")}
        </Button>
      </div>

      {feedback ? (
        <p
          // Announced rather than silently appearing: the outcome is the only
          // signal that a paste worked.
          role="status"
          className={cn(
            "mt-2 text-xs",
            feedback.kind === "ok" ? "text-success" : "text-danger",
          )}
        >
          {t(feedback.key)}
        </p>
      ) : null}
    </form>
  );
}
