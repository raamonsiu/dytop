import { useState } from "react";
import { Image, ListMusic, Plus, Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Brand } from "@/components/Brand";
import { NavTabs } from "@/components/NavTabs";
import { ViewToggle } from "@/components/ViewToggle";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { safeAreaOffset } from "@/lib/safeArea";
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
 * `revealed` only controls presentation, it is not used to unmount, so a panel
 * left open doesn't lose its state when the pointer wanders off.
 *
 * `radioMode` hides the four panel buttons and their popovers entirely: radio
 * has no personal queue/background/lyrics-settings to edit, only the shared
 * schedule. `PanelControls` owns `openPanel` itself and is only ever mounted
 * outside radio mode, so a panel left open before entering radio is simply
 * gone (state, not just UI) rather than popping back open on return.
 */
export function LegacyNavbar({
  revealed,
  radioMode = false,
}: {
  revealed: boolean;
  radioMode?: boolean;
}) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-40 flex justify-center p-3 transition-all duration-500"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(-120%)",
        // Rather than replacing p-3 outright: notchless screens keep the
        // usual 0.75rem, notched ones grow to clear the cutout.
        paddingTop: safeAreaOffset("top", 0.75),
      }}
      inert={!revealed}
    >
      <nav
        className={cn(
          "relative flex flex-wrap items-center justify-center gap-1 rounded-view border border-glass-border bg-glass-strong shadow-2xl backdrop-blur-xl",
          "px-2 py-1 sm:px-3",
        )}
      >
        <Brand view="legacy" />
        <span aria-hidden className="mx-1 h-4 w-px bg-glass-border sm:mx-2" />
        <NavTabs view="legacy" />
        <span aria-hidden className="mx-1 h-4 w-px bg-glass-border sm:mx-2" />

        {radioMode ? null : <PanelControls />}

        <span aria-hidden className="mx-1 h-4 w-px bg-glass-border" />
        <ViewToggle current="legacy" className="px-2" />
      </nav>
    </header>
  );
}

/** The four panel buttons and their popovers, as one unit so unmounting them
 * (radio mode) discards `openPanel` along with the UI. */
function PanelControls() {
  const { t } = useTranslation();
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);

  const toggle = (id: PanelId) => setOpenPanel((current) => (current === id ? null : id));

  return (
    <>
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
              // pointer-coarse grows this to a real touch target: these
              // panels (background, add, queue, lyrics) have no other way in.
              "grid size-8 place-items-center rounded-view transition-colors pointer-coarse:size-11",
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
    </>
  );
}
