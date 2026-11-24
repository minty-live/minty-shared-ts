import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";

import { DraftRestore } from "../DraftRestore";

describe("DraftRestore", () => {
  it("puts a draft back at once, with nothing drawn (the user, 2026-11-24: no need to ask)", () => {
    const restore = vi.fn();
    const discard = vi.fn();
    const { container } = render(<DraftRestore onRestore={restore} onDiscard={discard} />);
    expect(restore).toHaveBeenCalledOnce();
    expect(discard).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("puts it back once under Strict Mode too", () => {
    const restore = vi.fn();
    render(
      <StrictMode>
        <DraftRestore onRestore={restore} onDiscard={vi.fn()} />
      </StrictMode>,
    );
    expect(restore).toHaveBeenCalledOnce();
  });

  it.each([true, "locked"] as const)(
    "a stale draft (%s) is dropped silently, never put back",
    (stale) => {
      const restore = vi.fn();
      const discard = vi.fn();
      const { container } = render(
        <StrictMode>
          <DraftRestore stale={stale} onRestore={restore} onDiscard={discard} />
        </StrictMode>,
      );
      expect(discard).toHaveBeenCalledOnce();
      expect(restore).not.toHaveBeenCalled();
      expect(container).toBeEmptyDOMElement();
    },
  );

  it("acts once even when it renders again", () => {
    const restore = vi.fn();
    const { rerender } = render(<DraftRestore onRestore={restore} onDiscard={vi.fn()} />);
    rerender(<DraftRestore onRestore={() => restore()} onDiscard={vi.fn()} />);
    expect(restore).toHaveBeenCalledOnce();
  });
});
