import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // The Dither chunk (three + postprocessing) is ~950 kB and deliberately so.
    // It's lazy-loaded and only the minimal view ever asks for it, so the
    // default 500 kB warning is noise here rather than a signal.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // The Dither port pulls in three/WebGL, which jsdom can't render. Only the
    // pure modules are under test, so the view layer stays out of the run.
    include: ["src/**/*.test.ts"],
  },
});
