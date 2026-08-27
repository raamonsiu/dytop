import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useAddSongForm } from "@/lib/useAddSongForm";

export function AddSongPanel() {
  const { t } = useTranslation();
  const { url, setUrl, pending, setFocused, feedback, handleSubmit } = useAddSongForm();

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
          {t(feedback.key, feedback.params)}
        </p>
      ) : null}
    </form>
  );
}
