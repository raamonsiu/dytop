import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useTransientMessage } from "@/lib/useTransientMessage";
import { addTrackByUrl } from "@/player/controller";

export function AddSongPanel() {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const {
    message: feedback,
    show,
    clear,
  } = useTransientMessage<{ ok: boolean; key: string }>();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim() || pending) return;

    setPending(true);
    clear();
    const result = await addTrackByUrl(url);
    setPending(false);

    if (result.ok) {
      setUrl("");
      show({ ok: true, key: "player.added" });
    } else {
      show({ ok: false, key: "errors.invalidUrl" });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={t("player.pasteUrl")}
          aria-label={t("player.pasteUrl")}
          className="min-w-0 flex-1 rounded-view border border-glass-border bg-surface/60 px-3 py-2 text-xs text-foreground caret-accent outline-none placeholder:text-muted-foreground/45 focus-visible:border-accent"
        />
        <Button type="submit" variant="primary" disabled={pending}>
          {t(pending ? "player.adding" : "player.add")}
        </Button>
      </div>

      {feedback ? (
        <p
          role="status"
          className={cn("mt-2 text-xs", feedback.ok ? "text-success" : "text-danger")}
        >
          {t(feedback.key)}
        </p>
      ) : null}
    </form>
  );
}
