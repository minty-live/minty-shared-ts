/**
 * The files an auto-saved draft holds (receipts, invoices), kept in this browser's IndexedDB
 * (`minty-drafts`, store `files`): one record per draft key, each file as an ArrayBuffer with its
 * name, type and date - an ArrayBuffer, not a Blob, because older Safari loses Blobs it stores
 * (the same reason as minty-payment-request-web's `paymentRequestAttachmentStore.ts`).
 *
 * Behind a small interface so the tests swap in `memoryDraftFiles()`. Nothing here throws to the
 * caller's form: `drafts.ts` catches and logs.
 */

export type DraftFileStore = {
  put(key: string, files: readonly File[]): Promise<void>;
  get(key: string): Promise<File[]>;
  remove(key: string): Promise<void>;
  /** Every draft key holding files. */
  keys(): Promise<string[]>;
};

type StoredFile = { name: string; type: string; lastModified: number; buffer: ArrayBuffer };

const DB_NAME = "minty-drafts";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB would not open"));
    req.onblocked = () => reject(new Error("IndexedDB is blocked"));
  });
}

function run<R>(
  mode: IDBTransactionMode,
  act: (store: IDBObjectStore) => IDBRequest<R>,
): Promise<R> {
  return openDb().then(
    (db) =>
      new Promise<R>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = act(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? req.error ?? new Error("IndexedDB write failed"));
        };
        tx.onabort = tx.onerror;
      }),
  );
}

async function toStored(file: File): Promise<StoredFile> {
  return {
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    buffer: await file.arrayBuffer(),
  };
}

export const indexedDbDraftFiles: DraftFileStore = {
  async put(key, files) {
    const stored = await Promise.all(files.map(toStored));
    await run("readwrite", (s) => s.put(stored, key));
  },
  async get(key) {
    const stored = (await run("readonly", (s) => s.get(key))) as StoredFile[] | undefined;
    return (stored ?? []).map(
      (f) => new File([f.buffer], f.name, { type: f.type, lastModified: f.lastModified }),
    );
  },
  async remove(key) {
    await run("readwrite", (s) => s.delete(key));
  },
  async keys() {
    const all = await run("readonly", (s) => s.getAllKeys());
    return all.map(String);
  },
};

/** An in-memory store for tests (and for a browser with no IndexedDB). */
export function memoryDraftFiles(): DraftFileStore & { data: Map<string, File[]> } {
  const data = new Map<string, File[]>();
  return {
    data,
    async put(key, files) {
      data.set(key, [...files]);
    },
    async get(key) {
      return [...(data.get(key) ?? [])];
    },
    async remove(key) {
      data.delete(key);
    },
    async keys() {
      return [...data.keys()];
    },
  };
}
