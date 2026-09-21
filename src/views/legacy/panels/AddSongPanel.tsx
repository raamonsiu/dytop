import { useTranslation } from "react-i18next";
import { SearchResults } from "@/components/SearchResults";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useSongSearchField } from "@/lib/useSongSearchField";

/**
 * Legacy's "paste a URL or search" field. Same behaviour as the minimal view's
 * (see `useSongSearchField`); the results sit in the panel's own flow, since
 * the panel is already a popover.
 */
export function AddSongPanel() {
  const { t } = useTranslation();
  const { pending, feedback, onSubmit, inputProps, resultsProps, canSubmit } =
    useSongSearchField();

  return (
    <form onSubmit={onSubmit}>
      <div className="flex gap-2">
        <input
          {...inputProps}
          // Same idea as the D1 field: the text is the accent token, so here it
          // also follows the colour sampled from the active background.
          // pointer-coarse bumps this to 16px: iOS Safari force-zooms the page
          // on focus for any input under that size.
          className="min-w-0 flex-1 rounded-view border border-glass-border bg-surface/60 px-3 py-2 text-xs text-accent caret-accent outline-none placeholder:text-accent/35 focus-visible:border-accent pointer-coarse:text-base"
        />
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {t(pending ? "player.adding" : "player.add")}
        </Button>
      </div>

      {resultsProps ? (
        <SearchResults
          {...resultsProps}
          placement="inline"
          // No box of its own: the panel's frosted glass already frames it.
          className="-mx-2"
          noticeClassName="normal-case"
        />
      ) : null}

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
