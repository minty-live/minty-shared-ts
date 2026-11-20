import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DraftNotice, draftTimeText } from "../DraftNotice";

const at = (h: number, m: number, dayOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

describe("DraftNotice", () => {
  it("asks first: Restore or Discard, with the time the draft was kept", async () => {
    const restore = vi.fn();
    const discard = vi.fn();
    render(<DraftNotice savedAt={at(10, 42)} onRestore={restore} onDiscard={discard} />);
    expect(screen.getByRole("status")).toHaveTextContent("You have unsaved changes from 10:42.");
    await userEvent.click(screen.getByRole("button", { name: "Restore" }));
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(restore).toHaveBeenCalledOnce();
    expect(discard).toHaveBeenCalledOnce();
  });

  it("says when files were too large to keep", () => {
    render(
      <DraftNotice
        savedAt={at(9, 5)}
        missing={["scan.pdf"]}
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Some files weren't kept. Add them again.",
    );
  });

  it("a stale draft is never put back: only shown, read-only", async () => {
    render(
      <DraftNotice
        savedAt={at(10, 42)}
        stale
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
        describe={() => [{ label: "Cash sales", value: "HKD 120.00" }]}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "This was saved again after your unsaved changes from 10:42, so we haven't put them back.",
    );
    expect(screen.queryByRole("button", { name: "Restore" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Show what I typed" }));
    expect(screen.getByText("Cash sales")).toBeInTheDocument();
    expect(screen.getByText("HKD 120.00")).toBeInTheDocument();
  });

  it("a record the person can no longer change says so, and is never put back", () => {
    render(
      <DraftNotice savedAt={at(10, 42)} stale="locked" onRestore={vi.fn()} onDiscard={vi.fn()} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "You can't change this any more, so we haven't put back your unsaved changes from 10:42.",
    );
    expect(screen.queryByRole("button", { name: "Restore" })).toBeNull();
  });

  it("its buttons are a finger's size", () => {
    render(<DraftNotice savedAt={at(10, 42)} onRestore={vi.fn()} onDiscard={vi.fn()} />);
    for (const name of ["Restore", "Discard"]) {
      expect(screen.getByRole("button", { name }).className).toMatch(/min-h-11/);
    }
  });
});

describe("draftTimeText", () => {
  it("is the time today and the day and time otherwise", () => {
    expect(draftTimeText(at(7, 3))).toBe("07:03");
    expect(draftTimeText(at(7, 3, -1))).toMatch(/^\d{2} [A-Z][a-z]{2} \d{4}, 07:03$/);
  });
});
