import { Eye, EyeOff, PanelTop } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UiVisibility } from "@/constants/app";

const ICON_BY_STATE: Record<UiVisibility, typeof Eye> = {
  visible: Eye,
  "hidden-all": EyeOff,
  "hidden-partial": PanelTop,
};

/**
 * Always on screen, including while everything else is hidden — it's the only
 * way back, so it can't hide itself.
 */
export function HideUiToggle({
  state,
  onCycle,
}: {
  state: UiVisibility;
  onCycle: () => void;
}) {
  const { t } = useTranslation();
  const Icon = ICON_BY_STATE[state];

  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={t(`legacy.visibility.${state}`)}
      title={t(`legacy.visibility.${state}`)}
      className="fixed right-4 top-4 z-50 grid size-8 place-items-center rounded-view text-muted-foreground opacity-40 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Icon size={16} />
    </button>
  );
}
