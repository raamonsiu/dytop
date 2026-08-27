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
}: {
  state: UiVisibility;
  onChange: (next: UiVisibility) => void;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t("visibility.label")}
      className={cn(
        "flex items-center gap-0.5 rounded-view border border-glass-border bg-glass-strong p-0.5 backdrop-blur-xl",
        // Recedes until approached, so a control that must always be present
        // doesn't compete with the content in the quieter states.
        "opacity-40 transition-opacity hover:opacity-100 focus-within:opacity-100",
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
              "grid size-6 place-items-center rounded-view transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
              active
                ? "bg-accent/20 text-accent"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={12} />
          </button>
        );
      })}
    </div>
  );
}
