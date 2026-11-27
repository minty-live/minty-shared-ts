// The header's shared pieces (the user, 2026-11-27): one "‹ Back" and one company name in every
// app's bar. On hover the arrow and the word turn teal and only the word is underlined.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HEADER_BACK_CLASS, HeaderBack, HeaderCompany } from "../HeaderParts";

describe("HeaderBack", () => {
  it("is a back link to the fallback address, named Back, marked for tests", () => {
    render(<HeaderBack href="/entity/e1/co" />);
    const back = screen.getByRole("link", { name: "Back" });
    expect(back).toHaveAttribute("href", "/entity/e1/co");
    expect(back).toHaveAttribute("data-back-link");
  });

  it("turns teal as a whole and underlines only the word, never the arrow", () => {
    render(<HeaderBack href="/x" />);
    const back = screen.getByRole("link", { name: "Back" });
    expect(back.className).toContain("hover:text-text-link");
    expect(back.className).not.toMatch(/(^|\s)hover:underline/);
    expect(screen.getByText("Back")).toHaveClass("group-hover:underline");
    const arrow = back.querySelector("svg");
    expect(arrow).toHaveAttribute("aria-hidden", "true");
    expect(arrow).toHaveAttribute("fill", "currentColor");
    expect(arrow?.getAttribute("class")).not.toContain("underline");
  });

  it("is a 44px target with the house focus ring", () => {
    expect(HEADER_BACK_CLASS).toContain("min-h-11");
    expect(HEADER_BACK_CLASS).toContain("focus-visible:outline-border-focus");
  });

  it("direct: a plain link, no history step", () => {
    render(<HeaderBack href="/settings/integration" direct />);
    expect(screen.getByRole("link", { name: "Back" })).not.toHaveAttribute("data-back-link");
  });

  it("without an address it is a button the page answers", async () => {
    const onClick = vi.fn();
    render(<HeaderBack onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("takes another word and a fuller name", () => {
    render(<HeaderBack href="/" label="Done" ariaLabel="Back to your companies" />);
    expect(screen.getByRole("link", { name: "Back to your companies" })).toHaveTextContent("Done");
  });
});

describe("HeaderCompany", () => {
  it("draws the building and the name, which truncates", () => {
    const { container } = render(<HeaderCompany name="Company of Friends" />);
    expect(screen.getByText("Company of Friends")).toHaveClass("truncate");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
