import { useState } from "react";
import { Image, ListMusic, Plus, Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ViewToggle } from "@/components/ViewToggle";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { AddSongPanel } from "./panels/AddSongPanel";
import { BackgroundPanel } from "./panels/BackgroundPanel";
import { LyricsPanel } from "./panels/LyricsPanel";
import { QueuePanel } from "./panels/QueuePanel";

type PanelId = "background" | "add" | "queue" | "lyrics";

const PANEL_ICONS: Record<PanelId, typeof Plus> = {
  background: Image,
  add: Plus,
  queue: ListMusic,
  lyrics: Type,
};

/**
 * Floating navbar, revealed by proximity to the top edge.
 *
 * `revealed` only controls presentation — it is not used to unmount, so a panel
 * left open doesn't lose its state when the pointer wanders off.
 */
export function LegacyNavbar({ revealed }: { revealed: boolean }) {
  const { t } = useTranslation();
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);

  const toggle = (id: PanelId) => setOpenPanel((current) => (current === id ? null : id));

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 flex justify-center p-3 transition-all duration-500"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(-120%)",
      }}
      inert={!revealed}
    >
      <nav className="relative flex items-center gap-1 rounded-view border border-glass-border bg-glass-strong p-1 shadow-2xl backdrop-blur-xl">
        {(Object.keys(PANEL_ICONS) as PanelId[]).map((id) => {
          const Icon = PANEL_ICONS[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-label={t(`legacy.panels.${id}`)}
              aria-expanded={openPanel === id}
              className={cn(
                "grid size-8 place-items-center rounded-view transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
                openPanel === id
                  ? "bg-accent/15 text-accent"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={15} />
            </button>
          );
        })}

        <span aria-hidden className="mx-1 h-4 w-px bg-glass-border" />
        <LocaleSwitcher className="px-1" />
        <span aria-hidden className="mx-1 h-4 w-px bg-glass-border" />
        <ViewToggle current="legacy" className="px-2" />

        <Panel
          open={openPanel === "background"}
          onClose={() => setOpenPanel(null)}
          label={t("legacy.panels.background")}
        >
          <BackgroundPanel />
        </Panel>
        <Panel
          open={openPanel === "add"}
          onClose={() => setOpenPanel(null)}
          label={t("legacy.panels.add")}
        >
          <AddSongPanel />
        </Panel>
        <Panel
          open={openPanel === "queue"}
          onClose={() => setOpenPanel(null)}
          label={t("legacy.panels.queue")}
        >
          <QueuePanel />
        </Panel>
        <Panel
          open={openPanel === "lyrics"}
          onClose={() => setOpenPanel(null)}
          label={t("legacy.panels.lyrics")}
        >
          <LyricsPanel />
        </Panel>
      </nav>
    </header>
  );
}
