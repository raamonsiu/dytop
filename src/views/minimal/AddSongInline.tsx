import { useState } from "react";
import { useTranslation } from "react-i18next";
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
 *
 * Styled as a terminal prompt rather than a web form — square, monospaced, with
 * a blinking caret and a wide-tracked label. It's the one input in the view, so
 * it carries the D1 language instead of hiding from it.
 */
export function AddSongInline() {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState(false);
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
      <div
        className={cn(
          "flex items-stretch border bg-surface/70 backdrop-blur-md transition-colors",
          focused ? "border-accent" : "border-surface-border",
        )}
        // The inward accent glow from the D1ITO portfolio's cards, used here to
        // mark focus without a coloured ring.
        style={
          focused
            ? { boxShadow: "inset 0 0 34px -14px var(--accent-glow)" }
            : undefined
        }
      >
        <span
          aria-hidden
          className={cn(
            "grid shrink-0 place-items-center px-3 font-display text-sm transition-colors",
            focused ? "text-accent" : "text-muted-foreground",
          )}
        >
          ▍
        </span>

        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t("player.pasteUrl")}
          aria-label={t("player.pasteUrl")}
          className={cn(
            "min-w-0 flex-1 bg-transparent py-2.5 pr-3 font-mono text-xs tracking-wide",
            // Explicit rather than inherited: form controls don't take the
            // page's colour on their own, so without this the typed URL fell
            // back to the browser's default black on a near-black field.
            "text-foreground caret-accent",
            "outline-none placeholder:uppercase placeholder:tracking-widest placeholder:text-muted-foreground/45",
            "short:py-1.5",
          )}
        />

        <button
          type="submit"
          disabled={pending}
          className={cn(
            "shrink-0 border-l px-4 text-[11px] uppercase tracking-widest transition-colors",
            "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
            "disabled:cursor-not-allowed disabled:opacity-40",
            focused ? "border-accent" : "border-surface-border",
            "bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {t(pending ? "player.adding" : "player.add")}
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <div aria-hidden className="dot-grid h-1 w-10 shrink-0 text-muted-foreground/30" />
        {feedback ? (
          <p
            // Announced rather than silently appearing: the outcome is the only
            // signal that a paste worked.
            role="status"
            className={cn(
              "text-[11px] uppercase tracking-widest",
              feedback.kind === "ok" ? "text-success" : "text-danger",
            )}
          >
            {t(feedback.key)}
          </p>
        ) : null}
      </div>
    </form>
  );
}
