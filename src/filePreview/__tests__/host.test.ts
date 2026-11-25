// The host the app registers before any preview draws (src/filePreview/host.ts). Loaded on its
// own here, so no other test has registered one yet.

import { describe, expect, it, vi } from "vitest";

describe("the file preview host", () => {
  it("fails loudly when the app registered none", async () => {
    vi.resetModules();
    const { requireFilePreviewHost } = await import("../host");

    expect(() => requireFilePreviewHost()).toThrow(/registerFilePreviewHost/);
  });

  it("hands back what the app registered", async () => {
    vi.resetModules();
    const { registerFilePreviewHost, requireFilePreviewHost } = await import("../host");
    const host = { iconClass: "material-symbols-rounded", fetchBlob: vi.fn() };

    registerFilePreviewHost(host);

    expect(requireFilePreviewHost()).toBe(host);
  });
});
