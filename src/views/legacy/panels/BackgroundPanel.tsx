import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BACKGROUND_MODES, type BackgroundMode } from "@/constants/app";
import {
  addBackgroundFiles,
  deleteBackground,
  setActiveBackground,
  useActiveBackground,
  useBackgroundEntries,
} from "@/backgrounds/backgroundsStore";
import type { AddBackgroundError } from "@/backgrounds/repo";
import { cn } from "@/lib/cn";
import { setPref, usePref } from "@/lib/prefs";

export function BackgroundPanel() {
  const { t } = useTranslation();
  const entries = useBackgroundEntries();
  const active = useActiveBackground();
  const mode = usePref("backgroundMode");
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<AddBackgroundError[]>([]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErrors(await addBackgroundFiles([...files]));
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void handleFiles(event.dataTransfer.files);
        }}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-view border border-dashed border-glass-border px-3 py-3 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Upload size={14} />
          {t("background.upload")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
          className="hidden"
        />
      </div>

      {errors.length > 0 ? (
        <ul role="alert" className="text-xs text-danger">
          {[...new Set(errors)].map((error) => (
            <li key={error}>{t(`background.errors.${error}`)}</li>
          ))}
        </ul>
      ) : null}

      <div role="group" aria-label={t("background.mode")} className="flex gap-1">
        {BACKGROUND_MODES.map((candidate: BackgroundMode) => (
          <button
            key={candidate}
            type="button"
            onClick={() => setPref("backgroundMode", candidate)}
            aria-pressed={mode === candidate}
            className={cn(
              "flex-1 rounded-view border px-2 py-1.5 text-[10px] uppercase tracking-wide transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
              mode === candidate
                ? "border-accent bg-accent/15 text-accent"
                : "border-glass-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`background.modes.${candidate}`)}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("background.empty")}</p>
      ) : (
        <ul className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.id} className="group relative">
              <button
                type="button"
                onClick={() => setActiveBackground(entry.id)}
                aria-pressed={active?.id === entry.id}
                aria-label={t("background.select")}
                className={cn(
                  "block aspect-square w-full overflow-hidden rounded-view border transition-colors",
                  active?.id === entry.id ? "border-accent" : "border-glass-border",
                )}
              >
                {entry.kind === "video" ? (
                  <video src={entry.url} muted className="size-full object-cover" />
                ) : (
                  <img src={entry.url} alt="" className="size-full object-cover" />
                )}
              </button>

              <span className="pointer-events-none absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[8px] uppercase text-white">
                {entry.kind}
              </span>

              <button
                type="button"
                onClick={() => void deleteBackground(entry.id)}
                aria-label={t("background.remove")}
                // A touch screen has no hover to reveal this on, and deleting
                // a background is the one action here with no other way in.
                className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
              >
                <X size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
