// The free photo check (the user, 2026-11-24): a warning, never a refusal, for a receipt or
// invoice photo that looks blurry, too dark or too small - with no AI. The pixel maths is pure;
// the browser part (decode + canvas) falls back to saying nothing.

import { describe, expect, it } from "vitest";

import { photoQuality, photoQualityText, qualityOf, QUALITY_LIMITS } from "../quality";

/** A w×h grey image of text-like stripes: dark 3-px strokes on light paper. */
function sharp(w = 400, h = 560, paper = 240, ink = 30): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const line = Math.floor(y / 20) % 2 === 0 && y % 20 < 12;
      const stroke = x % 9 < 3 && x > 30 && x < w - 30;
      px[y * w + x] = line && stroke ? ink : paper;
    }
  return px;
}

/** The same picture box-blurred `r` times: the strokes melt into the paper. */
function blurred(w = 400, h = 560, passes = 8): Uint8ClampedArray {
  let px = sharp(w, h);
  for (let p = 0; p < passes; p++) {
    const next = new Uint8ClampedArray(px.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let n = 0;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const yy = y + dy;
            const xx = x + dx;
            if (yy >= 0 && yy < h && xx >= 0 && xx < w) {
              sum += px[yy * w + xx];
              n++;
            }
          }
        next[y * w + x] = sum / n;
      }
    px = next;
  }
  return px;
}

const PHONE = { width: 1080, height: 1512 };

describe("the free photo check", () => {
  it("says nothing about a sharp, bright photo of a good size", () => {
    expect(qualityOf(sharp(), 400, 560, PHONE)).toBeNull();
  });

  it("calls a photo blurry when even its strongest edges are soft", () => {
    expect(qualityOf(blurred(), 400, 560, PHONE)).toBe("blurry");
  });

  it("calls a photo too dark before judging its sharpness", () => {
    expect(qualityOf(sharp(400, 560, 40, 10), 400, 560, PHONE)).toBe("dark");
  });

  it("calls a photo too small by the original's short edge, whatever it shows", () => {
    expect(qualityOf(sharp(), 400, 560, { width: 480, height: 640 })).toBe("small");
  });

  it("calls a blank photo blurry: nothing in it can be read", () => {
    expect(qualityOf(new Uint8ClampedArray(400 * 560).fill(240), 400, 560, PHONE)).toBe("blurry");
  });

  it("keeps its limits in one place", () => {
    expect(QUALITY_LIMITS).toEqual({ minShortEdge: 600, minBrightness: 60, minEdgeStrength: 30 });
  });

  it("says nothing for a PDF, or where the browser can't decode the photo", async () => {
    const pdf = new File(["%PDF-1.4"], "invoice.pdf", { type: "application/pdf" });
    expect(await photoQuality(pdf)).toBeNull();
    // jsdom has no createImageBitmap: the check steps aside rather than guessing
    const png = new File([new Uint8Array([137, 80, 78, 71])], "r.png", { type: "image/png" });
    expect(await photoQuality(png)).toBeNull();
  });

  it("words each finding as the issue, then what to do (Part 11)", () => {
    expect(photoQualityText("blurry")).toBe(
      "This photo looks blurry. Check that it can be read, or take a clearer one.",
    );
    expect(photoQualityText("dark")).toBe(
      "This photo looks too dark. Check that it can be read, or take a brighter one.",
    );
    expect(photoQualityText("small")).toBe(
      "This photo is very small. Check that it can be read, or attach a larger one.",
    );
    // with several files, the line names the one it means
    expect(photoQualityText("blurry", "receipt.jpg")).toBe(
      "receipt.jpg looks blurry. Check that it can be read, or take a clearer one.",
    );
  });
});
