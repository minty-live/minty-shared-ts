import { act, renderHook } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";

/** The offer arrives a microtask after the read (never inside the effect itself). */
const settle = () =>
  act(async () => {
    await Promise.resolve();
  });
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearDraftsForUser,
  DRAFT_MAX_AGE_MS,
  DRAFT_MAX_FILE_BYTES,
  draftKey,
  draftScopeFromToken,
  fingerprint,
  readDraft,
  resetDraftsForTests,
  setDraftFileStoreForTests,
  sweepDrafts,
  useAutoSaveDraft,
  writeDraft,
  type DraftScope,
} from "../drafts";
import { memoryDraftFiles } from "../draftFiles";

const ANN: DraftScope = { userId: "u-ann", entityId: "e-1" };
const BOB: DraftScope = { userId: "u-bob", entityId: "e-1" };
let files = memoryDraftFiles();

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  files = memoryDraftFiles();
  setDraftFileStoreForTests(files);
  resetDraftsForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

type Props = {
  scope?: DraftScope | null;
  value: { amount: string };
  dirty: boolean;
  basedOn?: string | null;
  ready?: boolean;
  files?: File[];
};

function mount(initial: Props) {
  return renderHook(
    (p: Props) =>
      useAutoSaveDraft({
        scope: p.scope === undefined ? ANN : p.scope,
        form: "pc.sales",
        record: "2026-11-20",
        shape: 1,
        ready: p.ready ?? true,
        basedOn: p.basedOn ?? "3",
        value: p.value,
        dirty: p.dirty,
        files: p.files,
      }),
    { initialProps: initial },
  );
}

const KEY = draftKey(ANN, "pc.sales", "2026-11-20");
const stored = () => readDraft<{ amount: string }>(KEY, { userId: "u-ann", shape: 1 });

describe("keeping what is typed", () => {
  it("saves 2 seconds after the last change, and each change starts the wait again", () => {
    const hook = mount({ value: { amount: "" }, dirty: false });
    hook.rerender({ value: { amount: "1" }, dirty: true });
    act(() => vi.advanceTimersByTime(1500));
    hook.rerender({ value: { amount: "12" }, dirty: true });
    act(() => vi.advanceTimersByTime(1500));
    expect(stored()).toBeNull();
    act(() => vi.advanceTimersByTime(600));
    expect(stored()?.value).toEqual({ amount: "12" });
    expect(stored()?.basedOn).toBe("3");
  });

  it("keeps the last 2 seconds when the page is hidden or goes away", () => {
    const hook = mount({ value: { amount: "" }, dirty: false });
    hook.rerender({ value: { amount: "7" }, dirty: true });
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(stored()?.value).toEqual({ amount: "7" });
  });

  it("a save still waiting when the record changes goes to the old record, with its own values", () => {
    const hook = renderHook(
      (p: { record: string; amount: string }) =>
        useAutoSaveDraft({
          scope: ANN,
          form: "pc.sales",
          record: p.record,
          shape: 1,
          basedOn: "3",
          value: { amount: p.amount },
          dirty: p.amount !== "",
        }),
      { initialProps: { record: "2026-11-20", amount: "" } },
    );
    hook.rerender({ record: "2026-11-20", amount: "11" });
    hook.rerender({ record: "2026-11-21", amount: "" });
    expect(stored()?.value).toEqual({ amount: "11" });
    const other = readDraft(draftKey(ANN, "pc.sales", "2026-11-21"), { userId: "u-ann", shape: 1 });
    expect(other).toBeNull();
  });

  it("removes the draft once what is typed matches what is saved again", () => {
    const hook = mount({ value: { amount: "" }, dirty: false });
    hook.rerender({ value: { amount: "7" }, dirty: true });
    act(() => vi.advanceTimersByTime(2100));
    expect(stored()).not.toBeNull();
    hook.rerender({ value: { amount: "" }, dirty: false });
    expect(stored()).toBeNull();
  });

  it("keeps nothing with no signed-in person, or before the record is known", () => {
    const none = mount({ scope: null, value: { amount: "1" }, dirty: true });
    act(() => vi.advanceTimersByTime(3000));
    none.unmount();
    expect(window.localStorage.length).toBe(0);
    const loading = mount({ ready: false, value: { amount: "1" }, dirty: true });
    act(() => vi.advanceTimersByTime(3000));
    loading.unmount();
    expect(window.localStorage.length).toBe(0);
  });
});

describe("offering it back", () => {
  function keep(scope: DraftScope, amount: string, basedOn = "3", savedAt = Date.now()) {
    writeDraft(draftKey(scope, "pc.sales", "2026-11-20"), {
      v: 1,
      form: "pc.sales",
      record: "2026-11-20",
      shape: 1,
      userId: scope.userId,
      entityId: scope.entityId,
      savedAt,
      basedOn,
      value: { amount },
      files: [],
      missing: [],
    });
  }

  it("offers the draft and changes nothing until Restore", async () => {
    keep(ANN, "45");
    const hook = mount({ value: { amount: "" }, dirty: false });
    await settle();
    expect(hook.result.current.offer).toMatchObject({ stale: false, value: { amount: "45" } });
    // the freshly loaded (clean) form must not remove the draft while it is offered
    expect(stored()).not.toBeNull();
    let taken: ReturnType<typeof hook.result.current.restore> = null;
    act(() => {
      taken = hook.result.current.restore();
    });
    expect(taken).toMatchObject({ value: { amount: "45" } });
    expect(hook.result.current.offer).toBeNull();
  });

  it("offers it under React Strict Mode too (next dev runs every effect twice)", async () => {
    keep(ANN, "45");
    const hook = renderHook(
      () =>
        useAutoSaveDraft({
          scope: ANN,
          form: "pc.sales",
          record: "2026-11-20",
          shape: 1,
          basedOn: "3",
          value: { amount: "" },
          dirty: false,
        }),
      { wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode> },
    );
    await settle();
    expect(hook.result.current.offer).toMatchObject({ value: { amount: "45" } });
  });

  it("Discard removes it", async () => {
    keep(ANN, "45");
    const hook = mount({ value: { amount: "" }, dirty: false });
    await settle();
    act(() => hook.result.current.discard());
    expect(hook.result.current.offer).toBeNull();
    expect(stored()).toBeNull();
  });

  it("is stale when the record was saved again since", async () => {
    keep(ANN, "45", "3");
    const hook = mount({ value: { amount: "" }, dirty: false, basedOn: "4" });
    await settle();
    expect(hook.result.current.offer?.stale).toBe(true);
  });

  it("never offers another person's draft, nor an old or older-shaped one", async () => {
    keep(BOB, "99");
    const bobs = mount({ value: { amount: "" }, dirty: false });
    await settle();
    expect(bobs.result.current.offer).toBeNull();
    keep(ANN, "1", "3", Date.now() - DRAFT_MAX_AGE_MS - 1000);
    const old = mount({ value: { amount: "" }, dirty: false });
    await settle();
    expect(old.result.current.offer).toBeNull();
    expect(stored()).toBeNull();
    const key = draftKey(ANN, "pc.sales", "2026-11-20");
    writeDraft(key, {
      v: 1,
      form: "pc.sales",
      record: "2026-11-20",
      shape: 0,
      userId: "u-ann",
      entityId: "e-1",
      savedAt: Date.now(),
      basedOn: "3",
      value: { amount: "2" },
      files: [],
      missing: [],
    });
    const older = mount({ value: { amount: "" }, dirty: false });
    await settle();
    expect(older.result.current.offer).toBeNull();
  });

  it("clear (after the form's own save) removes it", () => {
    const hook = mount({ value: { amount: "" }, dirty: false });
    hook.rerender({ value: { amount: "9" }, dirty: true });
    act(() => vi.advanceTimersByTime(2100));
    act(() => hook.result.current.clear());
    expect(stored()).toBeNull();
  });
});

describe("files", () => {
  it("keeps a picked file and gives it back with the offer; one too large is named as missing", async () => {
    const receipt = new File(["abc"], "receipt.pdf", { type: "application/pdf" });
    const huge = new File(["x"], "scan.pdf", { type: "application/pdf" });
    Object.defineProperty(huge, "size", { value: DRAFT_MAX_FILE_BYTES + 1 });
    const hook = mount({ value: { amount: "" }, dirty: false });
    hook.rerender({ value: { amount: "5" }, dirty: true, files: [receipt, huge] });
    act(() => vi.advanceTimersByTime(2100));
    hook.unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(files.data.get(KEY)?.map((f) => f.name)).toEqual(["receipt.pdf"]);
    expect(stored()?.missing).toEqual(["scan.pdf"]);

    const back = mount({ value: { amount: "" }, dirty: false });
    await act(async () => {
      await Promise.resolve();
    });
    expect(back.result.current.offer?.files.map((f) => f.name)).toEqual(["receipt.pdf"]);
    expect(back.result.current.offer?.missing).toEqual(["scan.pdf"]);
  });
});

describe("when storage fails", () => {
  it("the form keeps working and the failure is logged once", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const hook = mount({ value: { amount: "" }, dirty: false });
    hook.rerender({ value: { amount: "1" }, dirty: true });
    act(() => vi.advanceTimersByTime(2100));
    hook.rerender({ value: { amount: "12" }, dirty: true });
    act(() => vi.advanceTimersByTime(2100));
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toBe("Draft not kept");
  });
});

describe("signing out and sweeping", () => {
  it("clearDraftsForUser removes only that person's drafts, files included", async () => {
    for (const scope of [ANN, BOB]) {
      const key = draftKey(scope, "pc.sales", "2026-11-20");
      writeDraft(key, {
        v: 1,
        form: "pc.sales",
        record: "2026-11-20",
        shape: 1,
        userId: scope.userId,
        entityId: scope.entityId,
        savedAt: Date.now(),
        basedOn: null,
        value: {},
        files: [],
        missing: [],
      });
      await files.put(key, [new File(["a"], "a.pdf")]);
    }
    await clearDraftsForUser("u-ann");
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(files.data.has(KEY)).toBe(false);
    const bobKey = draftKey(BOB, "pc.sales", "2026-11-20");
    expect(window.localStorage.getItem(bobKey)).not.toBeNull();
    expect(files.data.has(bobKey)).toBe(true);
  });

  it("the sweep drops old and unreadable drafts and files no draft names", async () => {
    window.localStorage.setItem("minty:draft:1:u-ann:-:x:y", "not json");
    window.localStorage.setItem("minty:draft:0:old-format", "{}");
    await files.put("minty:draft:1:orphan", [new File(["a"], "a.pdf")]);
    await sweepDrafts();
    expect(window.localStorage.length).toBe(0);
    expect(files.data.size).toBe(0);
  });
});

describe("scope and fingerprints", () => {
  const token = (claims: object) => `x.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.y`;

  it("reads the person and company from the token", () => {
    expect(draftScopeFromToken(token({ user_id: "u1", entity_id: "e1" }))).toEqual({
      userId: "u1",
      entityId: "e1",
    });
    expect(draftScopeFromToken(token({ user_id: "u1" }))).toEqual({ userId: "u1", entityId: null });
    expect(draftScopeFromToken(token({}))).toBeNull();
    expect(draftScopeFromToken(null)).toBeNull();
  });

  it("a fingerprint ignores key order and changes with the values", () => {
    expect(fingerprint({ a: 1, b: [1, 2] })).toBe(fingerprint({ b: [1, 2], a: 1 }));
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
  });
});
