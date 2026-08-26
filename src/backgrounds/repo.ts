import { MAX_BACKGROUND_BYTES } from "@/constants/player";
import { idbDelete, idbGetAll, idbPut, STORES } from "@/lib/idb";

export type BackgroundKind = "image" | "video";

/** As stored. The object URL is deliberately absent — see `BackgroundEntry`. */
export interface StoredBackground {
  id: string;
  kind: BackgroundKind;
  blob: Blob;
  createdAt: number;
}

/** As used: the stored record plus a URL minted for this session. */
export interface BackgroundEntry extends StoredBackground {
  url: string;
}

export type AddBackgroundError = "too-large" | "unsupported-type" | "quota" | "failed";

export interface AddBackgroundResult {
  added: BackgroundEntry[];
  errors: AddBackgroundError[];
}

function kindOf(blob: Blob): BackgroundKind | null {
  if (blob.type.startsWith("image/")) return "image";
  if (blob.type.startsWith("video/")) return "video";
  return null;
}

/**
 * Object URLs are minted per session, never persisted.
 *
 * The prototype stored them alongside the blob, but a URL from a previous page
 * load is already revoked by the time it's read back, so those entries came
 * back as broken images.
 */
function toEntry(stored: StoredBackground): BackgroundEntry {
  return { ...stored, url: URL.createObjectURL(stored.blob) };
}

export async function loadBackgrounds(): Promise<BackgroundEntry[]> {
  const stored = await idbGetAll<StoredBackground>(STORES.backgrounds).catch(() => []);
  return stored.sort((a, b) => a.createdAt - b.createdAt).map(toEntry);
}

/**
 * Stores uploaded files.
 *
 * Size is checked up front rather than left to IndexedDB. A quota failure
 * surfaces asynchronously on the transaction, and a 200 MB video dropped in
 * would otherwise fail silently — the prototype's behaviour.
 */
export async function addBackgrounds(files: File[]): Promise<AddBackgroundResult> {
  const added: BackgroundEntry[] = [];
  const errors: AddBackgroundError[] = [];

  for (const file of files) {
    const kind = kindOf(file);
    if (!kind) {
      errors.push("unsupported-type");
      continue;
    }
    if (file.size > MAX_BACKGROUND_BYTES) {
      errors.push("too-large");
      continue;
    }

    const record: StoredBackground = {
      id: crypto.randomUUID(),
      kind,
      blob: file,
      createdAt: Date.now(),
    };

    try {
      await idbPut(STORES.backgrounds, record);
      added.push(toEntry(record));
    } catch (error) {
      errors.push(
        error instanceof DOMException && error.name === "QuotaExceededError"
          ? "quota"
          : "failed",
      );
    }
  }

  return { added, errors };
}

/** Deletes the record and releases its object URL, so the blob can actually be
 * collected rather than pinned for the life of the page. */
export async function removeBackground(entry: BackgroundEntry): Promise<void> {
  URL.revokeObjectURL(entry.url);
  await idbDelete(STORES.backgrounds, entry.id).catch(() => {
    // Already gone, or storage unavailable; the UI has dropped it either way.
  });
}
