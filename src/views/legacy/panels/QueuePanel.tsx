import { useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { playTrack } from "@/player/controller";
import {
  removeFromUpcoming,
  reorderUpcoming,
  useHistory,
  useNowPlaying,
  useUpcoming,
} from "@/player/queueStore";
import type { Track } from "@/player/types";

/** Each section gets its own hue, as in the prototype: past, present, next. */
const SECTION_ACCENT = {
  history: "border-l-danger/50",
  now: "border-l-accent",
  upcoming: "border-l-sky-400/50",
} as const;

type Section = keyof typeof SECTION_ACCENT;

export function QueuePanel() {
  const { t } = useTranslation();
  const history = useHistory();
  const nowPlaying = useNowPlaying();
  const upcoming = useUpcoming();
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const recent = [...history].reverse();

  return (
    <div className="max-h-80 overflow-y-auto">
      {recent.length > 0 ? (
        <Section title={t("queue.history")}>
          {recent.map((track) => (
            <Row
              key={track.id}
              track={track}
              section="history"
              onSelect={() => playTrack(track.id)}
            />
          ))}
        </Section>
      ) : null}

      {nowPlaying ? (
        <Section title={t("queue.nowPlaying")}>
          <Row
            track={nowPlaying}
            section="now"
            onSelect={() => playTrack(nowPlaying.id)}
          />
        </Section>
      ) : null}

      <Section title={t("queue.upcoming", { count: upcoming.length })}>
        {upcoming.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">{t("queue.empty")}</p>
        ) : (
          upcoming.map((track, index) => (
            <Row
              key={track.id}
              track={track}
              section="upcoming"
              onSelect={() => playTrack(track.id)}
              onRemove={() => removeFromUpcoming(track.id)}
              draggable
              isDropTarget={dragOver === index}
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragOver={() => setDragOver(index)}
              onDrop={() => {
                const from = dragIndex.current;
                if (from !== null && from !== index) reorderUpcoming(from, index);
                dragIndex.current = null;
                setDragOver(null);
              }}
              onDragEnd={() => {
                dragIndex.current = null;
                setDragOver(null);
              }}
            />
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3">
      <h3 className="px-2 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

interface RowProps {
  track: Track;
  section: Section;
  onSelect: () => void;
  onRemove?: () => void;
  draggable?: boolean;
  isDropTarget?: boolean;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}

function Row({
  track,
  section,
  onSelect,
  onRemove,
  draggable,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: RowProps) {
  const { t } = useTranslation();
  // Deviation from the prototype, recorded in docs/PARITY.md: dragging is
  // armed from an explicit handle instead of the whole row. There, rows were
  // both draggable and double-clickable, and some browsers fire dragstart
  // before the second click completes, so the jump gesture was unreliable.
  const [armed, setArmed] = useState(false);

  return (
    <div
      draggable={draggable && armed}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver?.();
      }}
      onDrop={onDrop}
      onDragEnd={() => {
        setArmed(false);
        onDragEnd?.();
      }}
      className={cn(
        "group flex items-center gap-2 border-l-2 pl-2 pr-1",
        SECTION_ACCENT[section],
        isDropTarget && "bg-accent/10",
      )}
    >
      {draggable ? (
        <span
          role="button"
          tabIndex={-1}
          aria-label={t("queue.reorder")}
          onPointerDown={() => setArmed(true)}
          onPointerUp={() => setArmed(false)}
          className="cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        >
          <GripVertical size={12} />
        </span>
      ) : null}

      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 py-2 text-left transition-colors hover:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
      >
        <span className="block truncate text-xs">{track.title}</span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {track.author}
        </span>
      </button>

      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("queue.remove")}
          className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}
