import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isSessionExpired,
  resetSessionExpiredForTests,
  SESSION_EXPIRED_ASSETS,
  SESSION_EXPIRED_CAT,
  sessionExpiredUrl,
  showSessionExpired,
} from "../../lib/sessionExpired";
import { SessionExpiredDialog, SessionExpiredHost } from "../SessionExpired";

afterEach(() => {
  act(() => resetSessionExpiredForTests());
  vi.unstubAllGlobals();
});

describe("isSessionExpired", () => {
  it("reads the 401 body's reason", () => {
    expect(isSessionExpired({ error: "Unauthorized", reason: "session_expired" })).toBe(true);
    expect(isSessionExpired({ detail: "Unauthorized", reason: "session_expired" })).toBe(true);
    expect(isSessionExpired({ error: "Unauthorized" })).toBe(false);
    expect(isSessionExpired(null)).toBe(false);
    expect(isSessionExpired("session_expired")).toBe(false);
  });
});

describe("SessionExpiredHost", () => {
  it("opens once when raised and OK goes to the login page", async () => {
    let went = "";
    vi.stubGlobal("location", {
      ...window.location,
      set href(v: string) {
        went = v;
      },
    });
    render(<SessionExpiredHost />);
    expect(screen.queryByRole("alertdialog")).toBeNull();

    act(() => showSessionExpired("https://my.test/login?next=%2Fback"));
    act(() => showSessionExpired("https://my.test/login?next=%2Fother"));
    expect(sessionExpiredUrl()).toBe("https://my.test/login?next=%2Fback");

    const dialog = screen.getByRole("alertdialog", { name: "Your session has expired" });
    expect(dialog).toHaveTextContent("Sign in again to carry on.");
    await userEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(went).toBe("https://my.test/login?next=%2Fback");
  });

  it("Escape does what OK does", async () => {
    let went = "";
    vi.stubGlobal("location", {
      ...window.location,
      set href(v: string) {
        went = v;
      },
    });
    render(<SessionExpiredHost />);
    act(() => showSessionExpired("https://my.test/login"));
    await userEvent.keyboard("{Escape}");
    expect(went).toBe("https://my.test/login");
  });
});

describe("SessionExpiredDialog", () => {
  it("is the same pop-up, driven by its props (minty-web's login with ?expired=1)", async () => {
    const ok = vi.fn();
    render(<SessionExpiredDialog open onOk={ok} />);
    expect(screen.getByRole("button", { name: "OK" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(ok).toHaveBeenCalledOnce();
  });

  it("is minty-web's question modal with the clock cat in the corner", () => {
    render(<SessionExpiredDialog open onOk={() => {}} />);
    const dialog = screen.getByRole("alertdialog", { name: "Your session has expired" });
    expect(dialog.querySelector("img")?.getAttribute("src")).toBe(SESSION_EXPIRED_CAT);
    expect(SESSION_EXPIRED_ASSETS).toEqual([SESSION_EXPIRED_CAT]);
  });
});
