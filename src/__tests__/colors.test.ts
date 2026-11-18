import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "..", "colors.css"), "utf8");

describe("colors.css", () => {
  it("defines every primitive a role points at - an undefined one draws nothing, silently", () => {
    // 2026-11-18: the Minty Action primitives went missing and every tick box lost its fill.
    const defined = new Set([...css.matchAll(/^\s*(--minty-[a-z0-9-]+):/gm)].map((m) => m[1]));
    const used = new Set([...css.matchAll(/var\((--minty-[a-z0-9-]+)\)/g)].map((m) => m[1]));
    expect([...used].filter((name) => !defined.has(name))).toEqual([]);
  });

  it("ticks a checked box in Minty Action #3cbcc3 (owner, 2026-11-18)", () => {
    expect(css).toMatch(/--color-action-tick:\s*var\(--minty-mint-action-500\)/);
    expect(css).toMatch(/--minty-mint-action-500:\s*#3cbcc3/);
  });
});
