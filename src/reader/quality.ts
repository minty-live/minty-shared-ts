/**
 * The free photo check (the user, 2026-11-24): a receipt or invoice PHOTO that looks blurry, too
 * dark or too small gets a quiet warning the moment it is attached - no AI, nothing sent, and
 * never a refusal (the form saves as before). A PDF, or a browser that can't decode the photo,
 * says nothing.
 *
 * Blur is measured as the strength of the photo's SHARPEST edges (the 99th percentile of the
 * Laplacian's size, on a grey copy at most 512 px across), not the Laplacian's variance: a
 * receipt is mostly white paper, which drags a variance down while its text stays crisp.
 * Calibrated 2026-11-24 on drawn receipts: sharp ones score 100 and up (low contrast or three
 * lines included), a Gaussian blur of radius 3 about 50, radius 4 or more under 30 - so only a
 * photo that is genuinely hard to read is called blurry. Tune `QUALITY_LIMITS` on real photos.
 */

export type PhotoFinding = "blurry" | "dark" | "small";

export const QUALITY_LIMITS = {
  /** The original photo's short edge, in pixels. */
  minShortEdge: 600,
  /** Mean brightness of the grey copy, 0-255. */
  minBrightness: 60,
  /** The 99th percentile of |Laplacian| on the grey copy. */
  minEdgeStrength: 30,
} as const;

/** The longest edge of the copy measured. */
const MEASURED_EDGE = 512;

/**
 * The finding for a grey image (`grey`, `width` × `height`, one byte a pixel) whose original was
 * `original` in size: small first, then dark, then blurry; null when it looks fine.
 */
export function qualityOf(
  grey: ArrayLike<number>,
  width: number,
  height: number,
  original: { width: number; height: number },
): PhotoFinding | null {
  if (Math.min(original.width, original.height) < QUALITY_LIMITS.minShortEdge) return "small";
  let total = 0;
  for (let i = 0; i < width * height; i++) total += grey[i];
  if (total / (width * height) < QUALITY_LIMITS.minBrightness) return "dark";
  // |Laplacian| of every inner pixel, counted (it runs 0..1020), then its 99th percentile
  const counts = new Uint32Array(1021);
  let n = 0;
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = grey[i - 1] + grey[i + 1] + grey[i - width] + grey[i + width] - 4 * grey[i];
      counts[Math.min(1020, Math.abs(Math.round(lap)))]++;
      n++;
    }
  if (n === 0) return null;
  let seen = 0;
  let p99 = 0;
  for (let v = 0; v < counts.length; v++) {
    seen += counts[v];
    if (seen > n * 0.99) {
      p99 = v;
      break;
    }
  }
  return p99 < QUALITY_LIMITS.minEdgeStrength ? "blurry" : null;
}

/** The free check of an attached file, or null (not a photo, or the browser can't tell). */
export async function photoQuality(file: File): Promise<PhotoFinding | null> {
  if (!/^image\/(jpe?g|png)$/i.test(file.type)) return null;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return null;
  try {
    const bitmap = await createImageBitmap(file);
    const original = { width: bitmap.width, height: bitmap.height };
    const scale = Math.min(1, MEASURED_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return null;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const grey = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let i = 0; i < grey.length; i++)
      grey[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    return qualityOf(grey, canvas.width, canvas.height, original);
  } catch {
    // An odd file or a browser quirk: no finding rather than a wrong one.
    return null;
  }
}

const QUALITY_TEXT: Record<PhotoFinding, [string, string]> = {
  blurry: ["looks blurry", "take a clearer one"],
  dark: ["looks too dark", "take a brighter one"],
  small: ["is very small", "attach a larger one"],
};

/** The quiet line for a finding (Part 11: the issue, then what to do); `name` when files are several. */
export function photoQualityText(finding: PhotoFinding, name?: string): string {
  const [issue, action] = QUALITY_TEXT[finding];
  return `${name ?? "This photo"} ${issue}. Check that it can be read, or ${action}.`;
}
