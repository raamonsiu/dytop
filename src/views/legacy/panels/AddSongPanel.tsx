import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useTransientMessage } from "@/lib/useTransientMessage";
import { useChromeHold } from "@/lib/useUiVisibility";
import { addTrackByUrl } from "@/player/controller";

export function AddSongPanel() {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState(false);
  const {
    message: feedback,
    show,
    clear,
  } = useTransientMessage<{ ok: boolean; key: string }>();

  // The legacy chrome auto-hides too, and the panel lives inside it — losing a
  // half-typed URL to a timer would be just as bad here.
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t("player.pasteUrl")}
          aria-label={t("player.pasteUrl")}
          // Same idea as the D1 field: the text is the accent token, so here it
          // also follows the colour sampled from the active background.
          className="min-w-0 flex-1 rounded-view border border-glass-border bg-surface/60 px-3 py-2 text-xs text-accent caret-accent outline-none placeholder:text-accent/35 focus-visible:border-accent"
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
