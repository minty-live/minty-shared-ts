/**
 * What `./filePreview` and `./pdfPreview` need from the app drawing them (v0.37, the user,
 * 2026-11-24: Petty Cash's receipts preview as Bills' attachments do). Registered once, at module
 * load, by the app's own `lib/filePreview.ts`, which every screen imports the preview through.
 */
export type FilePreviewHost = {
  /**
   * The icon font class the app loads: `material-symbols-outlined` (Payment Request's
   * `main`/`development`) or `material-symbols-rounded` (Part 13 D-20; Petty Cash).
   */
  iconClass: string;
  /**
   * Fetch one of the app's API paths with its own sign-in and hand back a `blob:` URL, or null on
   * any failure. Bytes that come back with no usable type are typed `fallbackType`. Used for a
   * saved PDF (`previewApiPath`) and a saved iPhone HEIC's `?as=jpeg`.
   */
  fetchBlob: (apiPath: string, fallbackType: string) => Promise<string | null>;
};

let host: FilePreviewHost | null = null;

export function registerFilePreviewHost(next: FilePreviewHost): void {
  host = next;
}

export function requireFilePreviewHost(): FilePreviewHost {
  if (!host) {
    throw new Error(
      "@minty/shared/filePreview: no host registered - import the preview through the app's lib/filePreview.ts, which calls registerFilePreviewHost",
    );
  }
  return host;
}
