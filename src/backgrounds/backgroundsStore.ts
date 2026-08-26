import { createStore, useStoreSelector } from "@/lib/createStore";
import { getPrefs, setPref } from "@/lib/prefs";
import {
  addBackgrounds,
  loadBackgrounds,
  removeBackground,
  type AddBackgroundError,
  type BackgroundEntry,
} from "./repo";

interface BackgroundsState {
  entries: BackgroundEntry[];
  activeId: string | null;
  hydrated: boolean;
}

const backgroundsStore = createStore<BackgroundsState>({
  entries: [],
  activeId: null,
  hydrated: false,
});

let hydratePromise: Promise<void> | null = null;

/** Loads stored backgrounds once per page load. */
export function hydrateBackgrounds(): Promise<void> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = loadBackgrounds().then((entries) => {
    const savedId = getPrefs().activeBackgroundId;
    // The saved id may point at a background deleted in another tab.
    const activeId = entries.some((entry) => entry.id === savedId)
      ? savedId
      : (entries[0]?.id ?? null);

    backgroundsStore.set({ entries, activeId, hydrated: true });
  });

  return hydratePromise;
}

export function setActiveBackground(id: string | null): void {
  backgroundsStore.set((state) => ({ ...state, activeId: id }));
  setPref("activeBackgroundId", id);
}

export async function addBackgroundFiles(
  files: File[],
): Promise<AddBackgroundError[]> {
  const { added, errors } = await addBackgrounds(files);
  if (added.length === 0) return errors;

  const state = backgroundsStore.get();
  const entries = [...state.entries, ...added];
  backgroundsStore.set({ ...state, entries });

  // First upload becomes the active one; otherwise the view stays blank until
  // the user works out they also have to pick it.
  if (!state.activeId && added[0]) setActiveBackground(added[0].id);

  return errors;
}

export async function deleteBackground(id: string): Promise<void> {
  const state = backgroundsStore.get();
  const entry = state.entries.find((candidate) => candidate.id === id);
  if (!entry) return;

  const entries = state.entries.filter((candidate) => candidate.id !== id);
  backgroundsStore.set({ ...state, entries });

  if (state.activeId === id) {
    setActiveBackground(entries[0]?.id ?? null);
  }

  await removeBackground(entry);
}

/**
 * Picks a background other than the current one.
 *
 * Excluding the active entry matters: with a handful of backgrounds, a uniform
 * pick repeats the same one often enough that the rotation looks broken.
 */
export function pickRandomBackground(): void {
  const { entries, activeId } = backgroundsStore.get();
  const candidates = entries.filter((entry) => entry.id !== activeId);
  const pool = candidates.length > 0 ? candidates : entries;
  const next = pool[Math.floor(Math.random() * pool.length)];
  if (next) setActiveBackground(next.id);
}

export function useBackgroundEntries(): BackgroundEntry[] {
  return useStoreSelector(backgroundsStore, (state) => state.entries);
}

export function useActiveBackground(): BackgroundEntry | null {
  return useStoreSelector(
    backgroundsStore,
    (state) => state.entries.find((entry) => entry.id === state.activeId) ?? null,
  );
}
