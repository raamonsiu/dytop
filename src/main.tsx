import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { resolveTheme } from "@/themes/themes";
import { themeStyle } from "@/themes/themeStyle";
import type { ViewName } from "@/themes/tokens";
import "@/styles/globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("#root is missing from index.html");
}

function Swatches({ view }: { view: ViewName }) {
  return (
    <div
      data-view={view}
      style={themeStyle(resolveTheme(view, "dark"))}
      className="flex flex-col gap-4 p-8"
    >
      <p className="font-display text-xl">
        {view} <span className="text-xs text-muted-foreground">/ˈdi.to/</span>
      </p>
      <div className="pixel-divider h-1 w-40 text-muted-foreground" />
      <div className="flex items-center gap-3">
        <Button variant="primary">primary</Button>
        <Button>ghost</Button>
        <IconButton aria-label="play">▸</IconButton>
      </div>
      <div className="rounded-view border border-surface-border bg-glass p-4 text-sm backdrop-blur-md">
        glass panel · rounded-view · <span className="text-accent">accent</span>
      </div>
      <p className="text-sm text-muted-foreground">muted · selecciona este texto</p>
    </div>
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <div className="grid h-full grid-cols-2">
      <Swatches view="minimal" />
      <Swatches view="legacy" />
    </div>
  </StrictMode>,
);
