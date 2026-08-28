import { Eye, EyeOff, Minus, Pin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UI_VISIBILITY_STATES, type UiVisibility } from "@/constants/app";
import { cn } from "@/lib/cn";

const ICONS: Record<UiVisibility, typeof Eye> = {
  pinned: Pin,
  auto: Eye,
  "ring-only": Minus,
  hidden: EyeOff,
};

/**
 * One button per visibility state, with the active one marked.
 *
 * Replaces a single icon that cycled on click: that gave no clue which state
 * you were in, what the next one would be, or how to get back to a specific one
 * without clicking through the others.
 *
 * Stays on screen in every state, including `hidden`, because it is the only
 * way back from there.
 */
export function UiVisibilityControl({
  state,
  onChange,
  className,
  style,
  compact = false,
}: {
  state: UiVisibility;
  onChange: (next: UiVisibility) => void;
  className?: string;
  style?: React.CSSProperties;
  /** Full-width row instead of a corner widget: see useIsCompactLayout. */
  compact?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t("visibility.label")}
      style={style}
      className={cn(
        "flex items-center rounded-view border border-glass-border bg-glass-strong p-0.5 backdrop-blur-xl",
        // Spread across the row when full-width; huddled together otherwise.
        // self-stretch rather than w-full: both compact parents are flex
        // columns, and a 100% width would ignore this element's own margins
        // and overhang the right edge by exactly that much.
        compact ? "justify-around self-stretch" : "gap-0.5",
        // Recedes until approached, so a control that must always be present
        // doesn't compete with the content in the quieter states. There is no
        // "approach" on a touch screen, and as a full-width row next to a
        // solid player a faded bar just reads as broken, so both of those
        // keep it opaque.
        "opacity-40 transition-opacity hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100",
        compact && "opacity-100",
        className,
      )}
    >
      {UI_VISIBILITY_STATES.map((candidate) => {
        const Icon = ICONS[candidate];
        const active = candidate === state;
        return (
          <button
            key={candidate}
            type="button"
            role="radio"
            aria-checked={active}
            title={t(`visibility.${candidate}`)}
            aria-label={t(`visibility.${candidate}`)}
            onClick={() => onChange(candidate)}
            className={cn(
              // 24px is a mouse-only size, and this is the only way back from
              // `hidden`, so it grows to a real touch target on both a coarse
              // pointer and a phone-width layout.
              "grid size-6 place-items-center rounded-view transition-colors pointer-coarse:size-11",
              compact && "size-11",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
              active
                ? "bg-accent/20 text-accent"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={12} className={cn("pointer-coarse:size-5", compact && "size-5")} />
          </button>
        );
      })}
    </div>
  );
}
