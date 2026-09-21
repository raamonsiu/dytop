import { useTranslation } from "react-i18next";
import { SearchResults } from "@/components/SearchResults";
import { cn } from "@/lib/cn";
import { useSongSearchField } from "@/lib/useSongSearchField";

/**
 * How tracks enter the app: paste a YouTube URL, or type words to search (see
 * `useSongSearchField` for the behaviour, shared with legacy).
 *
 * Styled as a terminal prompt rather than a web form: square, monospaced, with
 * a blinking caret and a wide-tracked label. It's the one input in the view, so
 * it carries the D1 language instead of hiding from it.
 */
export function AddSongInline({ resultsAbove = false }: { resultsAbove?: boolean }) {
  const { t } = useTranslation();
  const { pending, focused, feedback, onSubmit, inputProps, resultsProps, canSubmit } =
    useSongSearchField({ resultsAbove });

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl">
      <div className="relative">
        {resultsProps ? (
          <SearchResults
            {...resultsProps}
            placement={resultsAbove ? "above" : "below"}
            className="border border-surface-border bg-surface/90 backdrop-blur-md"
          />
        ) : null}
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
            {...inputProps}
            className={cn(
              // pointer-coarse bumps this to 16px: iOS Safari force-zooms the
              // page on focus for any input under that size.
              "min-w-0 flex-1 bg-transparent py-2.5 pr-3 font-mono text-xs tracking-wide pointer-coarse:text-base",
              // The accent token, not the foreground: what you type reads as part
              // of the theme. Explicit because form controls don't inherit the
              // page's colour on their own: without it the URL fell back to the
              // browser's default black on a near-black field.
              // The placeholder is the same hue at low alpha, so it recedes
              // without introducing a second colour.
              "text-accent caret-accent",
              "outline-none placeholder:uppercase placeholder:tracking-widest placeholder:text-accent/35",
              "short:py-1.5",
            )}
          />

          <button
            type="submit"
            disabled={!canSubmit}
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
              feedback.ok ? "text-success" : "text-danger",
            )}
          >
            {t(feedback.key, feedback.params)}
          </p>
        ) : null}
      </div>
    </form>
  );
}
