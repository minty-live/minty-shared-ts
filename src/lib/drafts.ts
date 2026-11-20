"use client";

/**
 * Auto-saved drafts (the owner's decisions doc L1; the user's choices, 2026-11-20): what a person
 * types is kept IN THIS BROWSER 2 seconds after their last change, as a separate copy - never the
 * real payment request, report step or setting, which only the person's own Save writes. When they
 * come back to the form, `DraftNotice` asks first: "You have unsaved changes from 10:42" - Restore
 * or Discard.
 *
 * - JSON in localStorage (synchronous, so a pending save is flushed on `pagehide` - never
 *   `beforeunload`, banned in every app); files (receipts, invoices) in IndexedDB (`draftFiles.ts`),
 *   written when picked.
 * - Kept per person and company: `minty:draft:1:{user}:{entity|-}:{form}:{record}`, and the person
 *   is checked again on read, so a shared computer never shows one person's draft to another.
 * - Removed on the form's own successful Save (`clear`), on Discard, after 7 days, and on an
 *   explicit sign-out (`clearDraftsForUser`) - NOT on the 60-minute session expiry, which is one of
 *   the things it exists to survive.
 * - `basedOn` is the record's version when the draft was taken (a Petty Cash report's
 *   `edit_version`, a bill's `updated_at`, or `fingerprint(loaded values)`): if the record changed
 *   since, the offer is `stale` and is only shown, never put back over someone's save.
 * - A storage failure (quota, private mode, IndexedDB blocked) never breaks the form and never
 *   toasts: `console.error("Draft not kept", ...)` once per draft.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { decodeJwtPayload } from "./auth";
import { indexedDbDraftFiles, type DraftFileStore } from "./draftFiles";

export const DRAFT_DELAY_MS = 2000;
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const DRAFT_MAX_JSON_CHARS = 256 * 1024;
export const DRAFT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const DRAFT_MAX_FILES_BYTES = 25 * 1024 * 1024;
const ROOT = "minty:draft:";
const PREFIX = `${ROOT}1:`;

export type DraftScope = { userId: string; entityId: string | null };

export type DraftEnvelope<T> = {
  v: 1;
  form: string;
  record: string;
  shape: number;
  userId: string;
  entityId: string | null;
  savedAt: number;
  basedOn: string | null;
  value: T;
  files: { name: string; size: number }[];
  /** Files picked but too large to keep: the person adds them again. */
  missing: string[];
};

export type DraftOffer<T> = {
  savedAt: number;
  /** The record was saved again after this draft was taken: show it, never put it back. */
  stale: boolean;
  value: T;
  files: File[];
  missing: string[];
};

// ---- the file store (swappable for tests) ---------------------------------------------------

let fileStore: DraftFileStore = indexedDbDraftFiles;

/** Tests only: put an in-memory store (`memoryDraftFiles()`) in IndexedDB's place. */
export function setDraftFileStoreForTests(store: DraftFileStore): void {
  fileStore = store;
}

// ---- keys, scope and fingerprints -------------------------------------------------------------

const part = (s: string) => encodeURIComponent(s);

export function draftKey(scope: DraftScope, form: string, record: string): string {
  return `${PREFIX}${part(scope.userId)}:${part(scope.entityId ?? "-")}:${part(form)}:${part(record)}`;
}

function userPrefix(userId: string): string {
  return `${PREFIX}${part(userId)}:`;
}

/** The person and company a token names (`user_id`, `entity_id` claims), or null: no drafts. */
export function draftScopeFromToken(token: string | null | undefined): DraftScope | null {
  const claims = decodeJwtPayload(token);
  const userId = claims?.user_id;
  if (typeof userId !== "string" || !userId) return null;
  const entityId = claims?.entity_id;
  return { userId, entityId: typeof entityId === "string" && entityId ? entityId : null };
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stable(obj[k])}`)
    .join(",")}}`;
}

/** A short, stable marker of a value (key order ignored): `basedOn` for a record with no version. */
export function fingerprint(value: unknown): string {
  const text = stable(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// ---- reading and writing ----------------------------------------------------------------------

const logged = new Set<string>();

function notKept(key: string, form: string, reason: unknown): void {
  if (logged.has(key)) return;
  logged.add(key);
  console.error("Draft not kept", form, reason);
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function parse<T>(raw: string | null): DraftEnvelope<T> | null {
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as DraftEnvelope<T>;
    if (!env || env.v !== 1 || typeof env.userId !== "string" || typeof env.savedAt !== "number")
      return null;
    return env;
  } catch {
    return null;
  }
}

/** The draft kept under `key`, if it is this person's, this form's shape, and not expired. */
export function readDraft<T>(
  key: string,
  expect: { userId: string; shape: number },
  now: number = Date.now(),
): DraftEnvelope<T> | null {
  const store = storage();
  if (!store) return null;
  let raw: string | null = null;
  try {
    raw = store.getItem(key);
  } catch {
    return null;
  }
  const env = parse<T>(raw);
  if (!env) return null;
  if (env.userId !== expect.userId) return null; // never another person's
  if (env.shape !== expect.shape || now - env.savedAt > DRAFT_MAX_AGE_MS) {
    // the form changed since (or it is old): dropped, never put back
    removeDraft(key);
    return null;
  }
  return env;
}

export function writeDraft<T>(key: string, env: DraftEnvelope<T>): boolean {
  const store = storage();
  if (!store) return false;
  const text = JSON.stringify(env);
  if (text.length > DRAFT_MAX_JSON_CHARS) {
    notKept(key, env.form, `too large (${text.length} characters)`);
    return false;
  }
  try {
    store.setItem(key, text);
    return true;
  } catch (err) {
    notKept(key, env.form, err);
    return false;
  }
}

/** Remove a draft and its files. */
export function removeDraft(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* nothing kept */
  }
  fileStore.remove(key).catch(() => undefined);
}

function hasDraft(key: string): boolean {
  try {
    return storage()?.getItem(key) != null;
  } catch {
    return false;
  }
}

function draftKeys(): string[] {
  const store = storage();
  if (!store) return [];
  const out: string[] = [];
  try {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key?.startsWith(ROOT)) out.push(key);
    }
  } catch {
    return [];
  }
  return out;
}

/** Drop expired, unreadable or old-format drafts, and files no draft names. Once a page load. */
export async function sweepDrafts(now: number = Date.now()): Promise<void> {
  const kept = new Set<string>();
  for (const key of draftKeys()) {
    const env = key.startsWith(PREFIX) ? parse(storage()?.getItem(key) ?? null) : null;
    if (!env || now - env.savedAt > DRAFT_MAX_AGE_MS) removeDraft(key);
    else kept.add(key);
  }
  try {
    for (const key of await fileStore.keys()) if (!kept.has(key)) await fileStore.remove(key);
  } catch {
    /* no file store: nothing to sweep */
  }
}

let swept = false;

/**
 * An explicit sign-out: every draft this person kept in this app (this browser origin) goes,
 * files included. Resolves within `timeoutMs` whatever IndexedDB does, so sign-out never waits.
 */
export function clearDraftsForUser(userId: string, timeoutMs = 500): Promise<void> {
  const prefix = userPrefix(userId);
  const keys = draftKeys().filter((k) => k.startsWith(prefix));
  for (const key of keys) {
    try {
      storage()?.removeItem(key);
    } catch {
      /* nothing kept */
    }
  }
  const files = fileStore
    .keys()
    .then((all) =>
      Promise.all(all.filter((k) => k.startsWith(prefix)).map((k) => fileStore.remove(k))),
    )
    .then(() => undefined)
    .catch(() => undefined);
  return Promise.race([files, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}

// ---- the hook ---------------------------------------------------------------------------------

type Options<T> = {
  /** Null (no signed-in person, or no token yet): nothing is kept or offered. */
  scope: DraftScope | null;
  form: string;
  record: string;
  /** The form's own version of `value`'s shape: bump it when the fields change. */
  shape: number;
  /** False while the record loads: nothing is read or written until it is known. */
  ready?: boolean;
  basedOn?: string | null;
  value: T;
  /** Whether what is typed differs from what is saved. Clean = the draft is removed. */
  dirty: boolean;
  files?: readonly File[];
  delayMs?: number;
};

function fileSignature(files: readonly File[] | undefined): string {
  return (files ?? []).map((f) => `${f.name}|${f.size}|${f.lastModified}`).join("/");
}

function keepable(files: readonly File[]): { keep: File[]; missing: string[] } {
  const keep: File[] = [];
  const missing: string[] = [];
  let total = 0;
  for (const f of files) {
    if (f.size > DRAFT_MAX_FILE_BYTES || total + f.size > DRAFT_MAX_FILES_BYTES)
      missing.push(f.name);
    else {
      keep.push(f);
      total += f.size;
    }
  }
  return { keep, missing };
}

/**
 * Keep what a form holds as a browser draft (see the module note). Returns the draft to offer when
 * the form opens (`offer`) - nothing is written or removed until the person picks Restore or
 * Discard - and `clear`, which the form calls after its own Save succeeds and from its
 * leave-guard reset ("Discard changes").
 */
export function useAutoSaveDraft<T>(opts: Options<T>): {
  offer: DraftOffer<T> | null;
  restore: () => DraftOffer<T> | null;
  discard: () => void;
  clear: () => void;
} {
  const { scope, form, record, shape, ready = true, basedOn = null, value, dirty, files } = opts;
  const delayMs = opts.delayMs ?? DRAFT_DELAY_MS;
  const key = scope ? draftKey(scope, form, record) : null;
  const userId = scope?.userId ?? null;
  const json = JSON.stringify(value) ?? "null";
  const filesSig = fileSignature(files);

  // the offer is held with the key it was read for, so a new record never shows an old offer
  const [found, setFound] = useState<{ key: string; offer: DraftOffer<T> } | null>(null);
  const offer = found && found.key === key ? found.offer : null;
  // "loading" until the key's draft has been read; "offering" while an offer waits; else "idle"
  const phase = useRef<"loading" | "offering" | "idle">("loading");
  const readKey = useRef<string | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const pendingKey = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keptFiles = useRef<{ sig: string; missing: string[] }>({ sig: "", missing: [] });
  const latest = useRef({ scope, form, record, shape, basedOn, json, dirty, files, filesSig });
  // first of this hook's effects, so the ones below always read this render's values
  useEffect(() => {
    latest.current = { scope, form, record, shape, basedOn, json, dirty, files, filesSig };
  });

  const cancelPending = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
  }, []);

  // Read the draft once the key and the record are known.
  useEffect(() => {
    if (!key || !userId || !ready || readKey.current === key) return;
    readKey.current = key;
    phase.current = "loading";
    if (!swept) {
      swept = true;
      void sweepDrafts();
    }
    const env = readDraft<T>(key, { userId, shape });
    if (!env) {
      phase.current = "idle";
      return;
    }
    let live = true;
    const show = (kept: File[]) => {
      if (!live) return;
      phase.current = "offering";
      setFound({
        key,
        offer: {
          savedAt: env.savedAt,
          stale: (env.basedOn ?? null) !== (latest.current.basedOn ?? null),
          value: env.value,
          files: kept,
          missing: env.missing ?? [],
        },
      });
    };
    // always after this effect (a microtask at least): the form has rendered its loaded values
    const kept = env.files?.length ? fileStore.get(key) : Promise.resolve<File[]>([]);
    kept.then(show, () => show([]));
    return () => {
      live = false;
      // cleaned up before the offer arrived (React Strict Mode runs every effect twice in
      // development, and a new key does too): the next run must read again
      if (phase.current === "loading") readKey.current = null;
    };
  }, [key, userId, ready, shape]);

  // Keep what is typed: 2 s after the last change while dirty; removed once clean.
  useEffect(() => {
    // a save still waiting for another key (another record) is written there first, with the
    // values it was set up with - never this form's values under that key
    if (pending.current && pendingKey.current !== key) {
      const write = pending.current;
      cancelPending();
      write();
    }
    if (!key || phase.current !== "idle") return;
    const now = latest.current;
    if (!now.dirty) {
      cancelPending();
      if (hasDraft(key) || keptFiles.current.sig) removeDraft(key);
      keptFiles.current = { sig: "", missing: [] };
      return;
    }
    // files are kept when picked, not on the debounce
    if (now.filesSig !== keptFiles.current.sig) {
      const { keep, missing } = keepable(now.files ?? []);
      keptFiles.current = { sig: now.filesSig, missing };
      if (keep.length) fileStore.put(key, keep).catch((err) => notKept(key, now.form, err));
      else fileStore.remove(key).catch(() => undefined);
    }
    const at = now; // this render's values: what the person had typed when the wait began
    const write = () => {
      if (!at.scope || !at.dirty) return;
      const { keep } = keepable(at.files ?? []);
      writeDraft(key, {
        v: 1,
        form: at.form,
        record: at.record,
        shape: at.shape,
        userId: at.scope.userId,
        entityId: at.scope.entityId,
        savedAt: Date.now(),
        basedOn: at.basedOn ?? null,
        value: JSON.parse(at.json) as T,
        files: keep.map((f) => ({ name: f.name, size: f.size })),
        missing: keptFiles.current.missing,
      });
      pending.current = null;
    };
    cancelPending();
    pending.current = write;
    pendingKey.current = key;
    timer.current = setTimeout(write, delayMs);
  }, [key, json, dirty, filesSig, delayMs, cancelPending]);

  // A page that is going away keeps what was typed in the last 2 seconds too.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const flush = () => {
      const write = pending.current;
      if (!write) return;
      cancelPending();
      write();
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [cancelPending]);

  const restore = useCallback((): DraftOffer<T> | null => {
    const taken = offer;
    phase.current = "idle";
    setFound(null);
    return taken;
  }, [offer]);

  const discard = useCallback(() => {
    cancelPending();
    if (key) removeDraft(key);
    keptFiles.current = { sig: "", missing: [] };
    phase.current = "idle";
    setFound(null);
  }, [key, cancelPending]);

  const clear = useCallback(() => {
    cancelPending();
    if (key) removeDraft(key);
    keptFiles.current = { sig: "", missing: [] };
    if (phase.current === "offering") {
      phase.current = "idle";
      setFound(null);
    }
  }, [key, cancelPending]);

  return { offer, restore, discard, clear };
}

/** Tests only: forget the once-a-page sweep and the once-a-draft error log. */
export function resetDraftsForTests(): void {
  swept = false;
  logged.clear();
}
