// iPhone HEIC photos (lib/heic.ts; the user, 2026-11-24): stored as uploaded, drawn as they are
// where the browser can (Safari 17+), else asked for as a JPEG made on the fly by the API.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { browserDrawsHeic, canDraw, isHeic, resetHeicAnswer } from "../heic";

/** jsdom never loads images: this stands in for the browser's decoder. */
function fakeImages(draws: (src: string) => boolean) {
  const loaded: string[] = [];
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 0;
    set src(value: string) {
      loaded.push(value);
      queueMicrotask(() => {
        if (draws(value)) {
          this.naturalWidth = 40;
          this.onload?.();
        } else {
          this.onerror?.();
        }
      });
    }
  }
  vi.stubGlobal("Image", FakeImage);
  return loaded;
}

describe("isHeic(type, name)", () => {
  it.each([
    ["image/heic", "IMG_1.HEIC", true],
    ["IMAGE/HEIF", "photo.heif", true],
    ["image/heic-sequence", "a.heics", true],
    ["", "IMG_1.HEIC", true], // Windows and some Android pickers give no type
    ["application/octet-stream", "slip.heif", true],
    ["image/jpeg", "IMG_1.HEIC", false], // iOS already turned it into a JPEG
    ["image/png", "a.png", false],
    ["application/pdf", "a.pdf", false],
    ["", "a.jpg", false],
    [null, null, false],
  ])("%s / %s -> %s", (type, name, expected) => {
    expect(isHeic(type, name)).toBe(expected);
  });
});

describe("canDraw(url)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is true when the browser decodes the image", async () => {
    fakeImages(() => true);
    await expect(canDraw("blob:photo")).resolves.toBe(true);
  });

  it("is false when it can't", async () => {
    fakeImages(() => false);
    await expect(canDraw("blob:photo")).resolves.toBe(false);
  });

  it("is false with no Image at all (server rendering)", async () => {
    vi.stubGlobal("Image", undefined);
    await expect(canDraw("blob:photo")).resolves.toBe(false);
  });
});

describe("browserDrawsHeic(url)", () => {
  beforeEach(() => resetHeicAnswer());
  afterEach(() => vi.unstubAllGlobals());

  it("asks the browser once, with the first HEIC, and remembers its answer", async () => {
    const loaded = fakeImages(() => false);

    await expect(browserDrawsHeic("blob:first")).resolves.toBe(false);
    await expect(browserDrawsHeic("blob:second")).resolves.toBe(false);

    expect(loaded).toEqual(["blob:first"]);
  });

  it("is true on a browser that draws HEIC (Safari 17+)", async () => {
    fakeImages(() => true);
    await expect(browserDrawsHeic("blob:first")).resolves.toBe(true);
  });
});
