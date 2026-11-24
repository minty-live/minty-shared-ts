/**
 * iPhone HEIC/HEIF photos (the user, 2026-11-24). A HEIC is stored exactly as uploaded; it is
 * drawn as it is where the browser can (Safari 17+ on iPhone, iPad and Mac), and everywhere else
 * (Chrome, Edge, Firefox, Android) the page asks its API for a JPEG made on the fly - never a
 * stored copy. Whether the browser can is found out from the photo itself (`canDraw`), never from
 * the user agent, and remembered for the page's life after the first HEIC (`browserDrawsHeic`).
 */

const HEIC_TYPE = /^image\/hei[cf](-sequence)?$/i;
const HEIC_NAME = /\.hei[cf]s?$/i;

/**
 * True for a HEIC/HEIF by its type, or by its name when the type says nothing (empty or
 * `application/octet-stream`, as Windows and some Android pickers give). A `.HEIC` name with a
 * JPEG type is a JPEG: iOS converts the photo and keeps the name.
 */
export function isHeic(type: string | null | undefined, name?: string | null): boolean {
  const t = (type ?? "").trim();
  if (HEIC_TYPE.test(t)) return true;
  if (t && t.toLowerCase() !== "application/octet-stream") return false;
  return !!name && HEIC_NAME.test(name.trim());
}

/** Whether this browser decodes the image at `url`; false where there is no `Image`. */
export function canDraw(url: string): Promise<boolean> {
  if (typeof Image === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

let heicAnswer: Promise<boolean> | null = null;

/**
 * Whether this browser draws HEIC, found out with the first HEIC shown (`url`) and remembered for
 * the page's life. A HEIC that won't draw for another reason also answers false, which costs only
 * a JPEG made by the API.
 */
export function browserDrawsHeic(url: string): Promise<boolean> {
  heicAnswer ??= canDraw(url);
  return heicAnswer;
}

/** Tests only: forget the remembered answer. */
export function resetHeicAnswer(): void {
  heicAnswer = null;
}
