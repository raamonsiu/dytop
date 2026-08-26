import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("#root is missing from index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <main className="grid h-full place-items-center font-mono text-sm">
      DYTOP — scaffold
    </main>
  </StrictMode>,
);
