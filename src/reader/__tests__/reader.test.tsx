// The document reader (src/reader): its generic rules, the one-read-at-a-time hook with the quiet
// failure line's switch, and the classic-look pieces. Each app's own field rules and words are
// tested in the app (minty-petty-cash-web lib/expenseAi.ts, minty-payment-request-web
// lib/invoiceReader.ts).

import { act, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AI_CAUTION,
  BETA_LABEL,
  AiCaution,
  convertedText,
  documentWarningOf,
  documentWarningText,
  evidenceRefusalOf,
  exchangeFailedOf,
  exchangeFields,
  exchangeKept,
  exchangeNote,
  exchangeOf,
  rateText,
  severalDocuments,
  CHECK_RING,
  EMPTY_RING,
  outlined,
  outlineOf,
  outlineRing,
  PLEASE_CHECK,
  AllowanceNote,
  type Exchange,
  allowanceText,
  canRead,
  cleared,
  createReaderLatch,
  edited,
  failureOf,
  fillable,
  ReadButton,
  ReaderNote,
  readerState,
  readerStatusOf,
  ReadFailedLine,
  ReadingNotice,
  SuggestedLine,
  SUGGESTED_RING,
  suggestionsOf,
  usedNote,
  useDocumentReader,
  withoutDetectedName,
  withoutSuggestions,
  type ReaderSpec,
  type ReaderState,
} from "..";

type V = { date: string; amount: string };
type F = "date" | "amount";
const TODAY = "2026-11-04";
const SPEC: ReaderSpec<V, F> = {
  touchOnSame: true,
  cleared: (field) => (field === "date" ? { date: TODAY } : { amount: "" }),
  same: (field, before, after) =>
    field === "amount" && Number(before.amount) === Number(after.amount),
};
const start = (): ReaderState<V, F> => readerState<V, F>({ date: TODAY, amount: "" });

describe("the answer", () => {
  it("is trusted only in its shape", () => {
    expect(suggestionsOf({ suggestions: { amount: 1 }, reason: null })).toEqual({ amount: 1 });
    expect(suggestionsOf({ suggestions: null, reason: "timeout" })).toBeNull();
    expect(suggestionsOf("nonsense")).toBeNull();
  });

  it("is a failure to mention only when a read came back with nothing", () => {
    for (const reason of [
      "timeout",
      "provider_error",
      "rate_limited",
      "file_too_large",
      "invalid_reply",
    ])
      expect(failureOf({ suggestions: null, reason })).toBe(true);
    for (const reason of ["disabled", "not_configured", "no_context"])
      expect(failureOf({ suggestions: null, reason })).toBe(false);
    expect(failureOf({ suggestions: { amount: {} }, reason: "no_usable_field" })).toBe(false);
    expect(failureOf(null)).toBe(true);
  });
});

describe("the session latch", () => {
  beforeEach(() => sessionStorage.clear());

  it("switches the reader off for the session on an off answer, per reader", () => {
    const receipts = createReaderLatch("test.receipts");
    const invoices = createReaderLatch("test.invoices");
    receipts.noteAnswer({ reason: "timeout" });
    expect(receipts.readerOff()).toBe(false);
    receipts.noteAnswer({ reason: "disabled" });
    expect(receipts.readerOff()).toBe(true);
    expect(invoices.readerOff()).toBe(false);
    expect(sessionStorage.getItem("test.receipts")).toBe("off");
    receipts.reset();
    expect(receipts.readerOff()).toBe(false);
  });
});

describe("the rules around a form's own values", () => {
  it("an untouched default counts as fillable, a touched one never - even re-picked unchanged", () => {
    const s = start();
    expect(fillable(s, "date", false, true)).toBe(true);
    const repicked = edited(s, "date", { date: TODAY }, SPEC);
    expect(repicked.values).toEqual(s.values);
    expect(fillable(repicked, "date", false, true)).toBe(false);
    expect(fillable(repicked, "amount", true)).toBe(true);
  });

  it("without defaults, the same value again is no change at all", () => {
    const s = start();
    expect(edited(s, "amount", { amount: "" }, { cleared: SPEC.cleared })).toBe(s);
  });

  it("an edit takes the marking and the note; an edit the form calls the same keeps them", () => {
    const s: ReaderState<V, F> = {
      ...start(),
      values: { date: "2026-10-20", amount: "45" },
      marks: { date: "high", amount: "high" },
      notes: { amount: { text: "x", fill: { amount: "50" }, band: "high" } },
    };
    const grouped = edited(s, "amount", { amount: "45.00" }, SPEC);
    expect(grouped.marks.amount).toBe("high");
    expect(grouped.values.amount).toBe("45.00");
    const changed = edited(s, "date", { date: "2026-10-21" }, SPEC);
    expect(changed.marks).toEqual({ amount: "high" });
    expect(changed.touched).toEqual({ date: true });
  });

  it("Clear puts a field's default back, not a blank", () => {
    const s: ReaderState<V, F> = {
      ...start(),
      values: { date: "2026-10-20", amount: "45" },
      marks: { date: "high", amount: "medium" },
    };
    expect(cleared(s, "date", SPEC).values.date).toBe(TODAY);
    expect(cleared(s, "amount", SPEC).values.amount).toBe("");
    expect(cleared(start(), "date", SPEC)).toEqual(start()); // only a marked field
  });

  it("a note's value goes in marked; another document takes every suggestion back", () => {
    const s: ReaderState<V, F> = {
      ...start(),
      values: { date: "2026-10-20", amount: "9" },
      marks: { date: "high" },
      notes: { amount: { text: "x", fill: { amount: "50" }, band: "low" } },
      detectedName: "New Co",
    };
    const used = usedNote(s, "amount");
    expect(used.values.amount).toBe("50");
    expect(used.marks.amount).toBe("low");
    const fresh = withoutSuggestions(used, SPEC);
    expect(fresh.values).toEqual({ date: TODAY, amount: "" });
    expect(fresh.marks).toEqual({});
    expect(withoutDetectedName(s).detectedName).toBeNull();
  });
});

describe("useDocumentReader", () => {
  const file = new File(["%PDF-1.4"], "invoice.pdf", { type: "application/pdf" });
  const latch = () => createReaderLatch(`test.reader.${Math.random()}`);

  it("posts the document under its field and hands the suggestions over", async () => {
    const post = vi.fn().mockResolvedValue({ suggestions: { amount: 1 }, reason: null });
    const got = vi.fn();
    const { result } = renderHook(() =>
      useDocumentReader({ post, field: "invoice", latch: latch(), onSuggestions: got }),
    );
    await act(() => result.current.read(file));
    const form = post.mock.calls[0][0] as FormData;
    expect((form.get("invoice") as File).name).toBe("invoice.pdf");
    expect(got).toHaveBeenCalledWith({ amount: 1 });
    expect(result.current).toMatchObject({ reading: false, failed: false });
  });

  it("raises the quiet line for a failed read, a cut connection, or nothing shown", async () => {
    for (const post of [
      vi.fn().mockResolvedValue({ suggestions: null, reason: "timeout" }),
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    ]) {
      const { result } = renderHook(() =>
        useDocumentReader({ post, field: "f", latch: latch(), onSuggestions: () => true }),
      );
      await act(() => result.current.read(file));
      expect(result.current.failed).toBe(true);
    }
    const nothing = vi.fn().mockResolvedValue({ suggestions: { a: 1 }, reason: "no_usable_field" });
    const { result } = renderHook(() =>
      useDocumentReader({ post: nothing, field: "f", latch: latch(), onSuggestions: () => false }),
    );
    await act(() => result.current.read(file));
    expect(result.current.failed).toBe(true);
    act(() => result.current.cancel());
    expect(result.current.failed).toBe(false);
  });

  it("hands the document's type warning to the form, read or refused, and clears it otherwise", async () => {
    // the user, 2026-11-24: a warning, never a refusal - the suggestions still fill
    const answers = [
      { suggestions: { amount: 1 }, reason: null, document_warning: "bank_payment_confirmation" },
      { suggestions: null, reason: "several_documents", document_warning: "other" },
      { suggestions: { amount: 1 }, reason: null },
    ];
    const warned = vi.fn();
    const got = vi.fn();
    for (const answer of answers) {
      const post = vi.fn().mockResolvedValue(answer);
      const { result } = renderHook(() =>
        useDocumentReader({
          post,
          field: "f",
          latch: latch(),
          onSuggestions: got,
          onWarning: warned,
        }),
      );
      await act(() => result.current.read(file));
    }
    expect(warned.mock.calls).toEqual([["bank_payment_confirmation"], ["other"], [null]]);
    expect(got).toHaveBeenCalledTimes(2); // a warned read still fills
  });

  it("hands a refused document to the form, never as the quiet failure line", async () => {
    // several documents in the file - the only refusal (the user, 2026-11-25)
    for (const reason of ["several_documents"]) {
      const post = vi.fn().mockResolvedValue({ suggestions: null, reason });
      const refused = vi.fn();
      const got = vi.fn();
      const { result } = renderHook(() =>
        useDocumentReader({
          post,
          field: "f",
          latch: latch(),
          onSuggestions: got,
          onRefused: refused,
        }),
      );
      await act(() => result.current.read(file));
      expect(refused).toHaveBeenCalledWith(reason);
      expect(got).not.toHaveBeenCalled();
      expect(result.current.failed).toBe(false);
    }
  });

  it("says nothing when switched off, and never reads again that session", async () => {
    const l = latch();
    const post = vi.fn().mockResolvedValue({ suggestions: null, reason: "disabled" });
    const { result } = renderHook(() =>
      useDocumentReader({ post, field: "f", latch: l, onSuggestions: () => true }),
    );
    await act(() => result.current.read(file));
    expect(result.current.failed).toBe(false);
    await act(() => result.current.read(file));
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("drops an answer for a document no longer there", async () => {
    let answer!: (value: unknown) => void;
    const post = vi.fn(() => new Promise((resolve) => (answer = resolve)));
    const got = vi.fn();
    const { result } = renderHook(() =>
      useDocumentReader({ post, field: "f", latch: latch(), onSuggestions: got }),
    );
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.read(file);
    });
    await vi.waitFor(() => expect(post).toHaveBeenCalled());
    act(() => result.current.cancel());
    await act(async () => {
      answer({ suggestions: { a: 1 }, reason: null });
      await pending;
    });
    expect(got).not.toHaveBeenCalled();
    expect(result.current.failed).toBe(false);
  });
});

describe("the classic pieces", () => {
  it("draw the app's words, a 44px Clear and a polite failure line", async () => {
    const clear = vi.fn();
    const use = vi.fn();
    render(
      <>
        <ReadingNotice
          title="Minty is reading the invoice details."
          detail="You can keep typing."
        />
        <SuggestedLine
          id="s1"
          text="Suggested from the invoice. Check it before you submit."
          clearLabel="Clear the suggested value for this field"
          onClear={clear}
        />
        <ReaderNote
          text={'The invoice reads "<b>x</b>".'}
          action="Use the value from the invoice"
          onAction={use}
        />
        <ReadFailedLine text="I couldn't read this invoice. Enter the details yourself." />
      </>,
    );
    expect(screen.getAllByRole("status").map((n) => n.textContent)).toEqual([
      "Minty is reading the invoice details.You can keep typing.",
      "I couldn't read this invoice. Enter the details yourself.",
    ]);
    const button = screen.getByRole("button", { name: "Clear the suggested value for this field" });
    // the phone wrap (the user, 2026-11-25): Clear follows the sentence in one text block, so a
    // long line wraps as words, never the sparkle or Clear alone on a line
    const sentence = screen.getByText("Suggested from the invoice. Check it before you submit.");
    expect(sentence.parentElement).toBe(button.parentElement);
    expect(sentence.parentElement).toHaveClass("min-w-0");
    expect(button).toHaveClass("whitespace-nowrap");
    // 44px to tap (20px line + 4 above + 20 below; 36 + 8 + 8 wide), never over the field above
    expect(button).toHaveClass(
      "relative",
      "before:absolute",
      "before:-top-1",
      "before:-bottom-5",
      "before:-inset-x-2",
    );
    await userEvent.click(button);
    await userEvent.click(screen.getByRole("button", { name: "Use the value from the invoice" }));
    expect(clear).toHaveBeenCalledTimes(1);
    expect(use).toHaveBeenCalledTimes(1);
    expect(screen.getByText('The invoice reads "<b>x</b>".')).toBeInTheDocument(); // text, never markup
    expect(SUGGESTED_RING).toBe("ring-2 ring-border-selected ring-offset-1");
  });

  it("draw a field to check in the warning ink", () => {
    render(
      <SuggestedLine
        id="s2"
        text="Please check"
        tone="check"
        clearLabel="Clear"
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText("Please check").closest("div")).toHaveClass("text-status-warning-ink");
  });

  it("draw the caution under AI-filled fields: the owner's sentence, read with the form", () => {
    render(<AiCaution id="ai-caution" />);
    const note = screen.getByText(AI_CAUTION);
    expect(AI_CAUTION).toBe("AI suggestions may be inaccurate.");
    expect(note).toHaveAttribute("id", "ai-caution");
    expect(note).toHaveClass("text-sm"); // never under 12px
    expect(note).toHaveClass("text-status-warning-ink"); // amber (the user, 2026-11-23)
    expect(note).not.toHaveClass("text-text-secondary");
    expect(note).not.toHaveAttribute("role"); // not an alert: it stays on the form, quietly
  });

  it("draw the read button: 44px, radius 12, never a submit", async () => {
    const read = vi.fn();
    const submit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={submit}>
        <ReadButton label="Read the receipt" onClick={read} />
      </form>,
    );
    const button = screen.getByRole("button", { name: "Read the receipt" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("min-h-11", "rounded-[12px]");
    await userEvent.click(button);
    expect(read).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------------------------
// The company's AI reads (owner, 2026-11-18): one allowance for Petty Cash and Payment Request.

describe("the AI allowance", () => {
  const open = {
    enabled: true,
    reads_used: null,
    reads_limit: null,
    reads_left: null,
    percent_left: 80,
    blocked: false,
    resumes_at: null,
  };

  it("says how much of the allowance is left", () => {
    expect(allowanceText(open)).toBe("80% of your AI allowance left");
    expect(canRead(open)).toBe(true);
  });

  it("falls back to a count of reads from an API that sends no percent", () => {
    expect(allowanceText({ enabled: true, reads_left: 7, reads_limit: 10 })).toBe("7 of 10 left");
  });

  it("says nothing when the reader is off or the API sends no count", () => {
    expect(allowanceText({ enabled: false })).toBeNull();
    expect(allowanceText({ enabled: true })).toBeNull();
    expect(canRead({ enabled: false })).toBe(false);
    expect(canRead(null)).toBe(false);
  });

  it("says why reading stopped, for good or until a date", () => {
    const usedUp = { ...open, percent_left: 0, blocked: true };
    expect(allowanceText(usedUp)).toBe(
      "Your company has used its AI allowance. Fill in the details yourself.",
    );
    expect(canRead(usedUp)).toBe(false);
    const paused = { ...usedUp, resumes_at: "2026-11-19T09:00:00+00:00" };
    expect(allowanceText(paused)).toBe(
      "AI reading is paused until 19 Nov. Fill in the details yourself for now.",
    );
  });

  it("reads the status out of an answer only when it has the shape", () => {
    expect(readerStatusOf({ suggestions: null, reason: "limit_reached", reader: open })).toEqual(
      open,
    );
    expect(readerStatusOf({ suggestions: null, reason: "timeout" })).toBeNull();
    expect(readerStatusOf({ reader: { percent_left: 3 } })).toBeNull();
  });

  it("draws the line beside the button and the button disabled with it", () => {
    const blocked = { ...open, percent_left: 0, blocked: true };
    render(
      <>
        <ReadButton label="Read receipt" onClick={() => {}} disabled describedBy="ai-left" />
        <AllowanceNote id="ai-left" status={blocked} />
      </>,
    );
    const button = screen.getByRole("button", { name: "Read receipt" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(/used its AI allowance/);
  });

  it("is not a failure when the allowance is used up, and hands the status to the form", async () => {
    const latch = createReaderLatch("test.allowance");
    latch.reset();
    const onStatus = vi.fn();
    const blocked = { ...open, percent_left: 0, blocked: true };
    const post = vi
      .fn()
      .mockResolvedValue({ suggestions: null, reason: "limit_reached", reader: blocked });
    const { result } = renderHook(() =>
      useDocumentReader({ post, field: "receipt", latch, onSuggestions: () => true, onStatus }),
    );

    await act(() => result.current.read(new File(["%PDF"], "r.pdf", { type: "application/pdf" })));

    expect(onStatus).toHaveBeenCalledWith(blocked);
    expect(result.current.failed).toBe(false);
    expect(latch.readerOff()).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// An amount read in another currency (owner, 2026-11-19): converted at Frankfurter's rate.

const EXCHANGE: Exchange = {
  original_currency: "USD",
  original_amount: "12.34",
  rate: "7.846",
  rate_date: "2026-11-13",
  date_basis: "receipt",
  source: "Frankfurter",
};
/** A currency weaker than the company's: under 1 HKD a unit, stored as Frankfurter gives it. */
const PHP: Exchange = {
  ...EXCHANGE,
  original_currency: "PHP",
  original_amount: "10000",
  rate: "0.13456",
};

describe("an amount converted from another currency", () => {
  it("reads the API's exchange, and nothing that isn't one", () => {
    expect(exchangeOf({ amount: {}, exchange: EXCHANGE })).toEqual(EXCHANGE);
    expect(exchangeOf({ exchange: { ...EXCHANGE, date_basis: "invoice" } })).toBeNull();
    expect(exchangeOf({ exchange: { ...EXCHANGE, rate: "" } })).toBeNull();
    expect(exchangeOf({})).toBeNull();
    expect(exchangeOf(null)).toBeNull();
    expect(exchangeFailedOf({ exchange_failed: { currency: "TWD" } })).toBe("TWD");
    expect(exchangeFailedOf({ exchange_failed: {} })).toBeNull();
  });

  it("travels with the line only while the amount is still the converted one", () => {
    expect(exchangeKept("96.82", "96.82")).toBe(true);
    expect(exchangeKept("1,096.82", "1096.82")).toBe(true); // the field's grouping
    expect(exchangeKept("96.8", "96.80")).toBe(true);
    expect(exchangeKept("96.83", "96.82")).toBe(false);
    expect(exchangeKept("", "96.82")).toBe(false);
  });

  it("gives the save its six fields by the API's names", () => {
    expect(exchangeFields(EXCHANGE)).toEqual({
      original_currency: "USD",
      original_amount: "12.34",
      exchange_rate: "7.846",
      exchange_rate_date: "2026-11-13",
      exchange_rate_basis: "receipt",
      exchange_rate_source: "Frankfurter",
    });
  });

  it("says how it was converted, which way the rate runs, and why its day differs", () => {
    expect(convertedText(EXCHANGE, "HKD")).toBe(
      "converted from USD\u00a012.34 at 1 USD = 7.85 HKD (13 Nov 2026 rate)",
    );
    // a Sunday's receipt: Friday's rate, and the page says why
    expect(convertedText({ ...EXCHANGE, asked_date: "2026-11-15" }, "HKD")).toBe(
      "converted from USD\u00a012.34 at 1 USD = 7.85 HKD (13 Nov 2026 rate, the last business day before 15 Nov 2026)",
    );
    expect(convertedText({ ...EXCHANGE, asked_date: "2026-11-13" }, "HKD")).toBe(
      "converted from USD\u00a012.34 at 1 USD = 7.85 HKD (13 Nov 2026 rate)",
    );
    // the weaker currency on the right (owner, 2026-11-24)
    expect(convertedText({ ...PHP }, "HKD")).toBe(
      "converted from PHP\u00a010,000.00 at 1 HKD = 7.43 PHP (13 Nov 2026 rate)",
    );
    // no company code: no rate at all, never a rate naming one currency
    expect(convertedText(EXCHANGE)).toBe("converted from USD\u00a012.34 (13 Nov 2026 rate)");
  });

  it("writes a rate as 1 of the stronger currency, 2 decimals, rounded (owner, 2026-11-24)", () => {
    // the stored rate is the company currency per 1 foreign unit; only the display flips
    expect(rateText(EXCHANGE, "HKD")).toBe("1 USD = 7.85 HKD");
    expect(rateText(PHP, "HKD")).toBe("1 HKD = 7.43 PHP");
    expect(rateText({ ...EXCHANGE, original_currency: "KRW", rate: "0.0058306" }, "HKD")).toBe(
      "1 HKD = 171.51 KRW",
    );
    expect(rateText({ ...EXCHANGE, rate: "1.3412" }, "SGD")).toBe("1 USD = 1.34 SGD");
    expect(rateText({ ...EXCHANGE, original_currency: "IDR", rate: "0.00008" }, "SGD")).toBe(
      "1 SGD = 12,500.00 IDR",
    );
    expect(rateText({ ...EXCHANGE, original_currency: "MOP", rate: "1" }, "HKD")).toBe(
      "1 MOP = 1.00 HKD",
    );
    // the saved line keeps the rate at full precision
    expect(exchangeFields(PHP).exchange_rate).toBe("0.13456");
  });

  it("marks the read button Beta: a blue pill beside the label, the button's name unchanged (the user, 2026-11-26)", () => {
    render(<ReadButton label="Read receipt" onClick={() => {}} />);
    const button = screen.getByRole("button", { name: "Read receipt" });
    const pill = within(button).getByText(BETA_LABEL);
    expect(BETA_LABEL).toBe("Beta");
    expect(pill).toHaveClass(
      "bg-status-info-bg",
      "text-status-info-ink",
      "rounded-full",
      "text-xs",
    );
    expect(pill).toHaveAttribute("aria-hidden", "true");
  });

  it("marks the caution Beta beside the sentence, the sentence still the description (the user, 2026-11-26)", () => {
    render(<AiCaution id="c" />);
    const pill = screen.getByText(BETA_LABEL);
    expect(pill).toHaveClass("bg-status-info-bg", "text-status-info-ink");
    expect(pill).not.toHaveAttribute("aria-hidden");
    expect(pill.closest("div")).toContainElement(document.getElementById("c"));
    expect(document.getElementById("c")).not.toContainElement(pill);
  });

  it("the caution is one sentence, the same for a receipt, an invoice and a converted amount", () => {
    render(<AiCaution id="c" />);
    expect(document.getElementById("c")).toHaveTextContent(/^AI suggestions may be inaccurate\.$/);
  });

  it("notes the original amount and the rate, both currencies named (owner, 2026-11-24)", () => {
    // plain spaces: the description goes to Xero
    expect(exchangeNote(EXCHANGE, "HKD")).toBe("(USD 12.34 @ 1 USD = 7.85 HKD)");
    expect(exchangeNote(PHP, "HKD")).toBe("(PHP 10,000.00 @ 1 HKD = 7.43 PHP)");
  });
});

describe("a document that may not be a receipt or invoice (the user, 2026-11-24)", () => {
  it("reads the warning out of an answer, and nothing else", () => {
    for (const kind of ["bank_payment_confirmation", "other", "unreadable"])
      expect(documentWarningOf({ suggestions: null, reason: null, document_warning: kind })).toBe(
        kind,
      );
    expect(
      documentWarningOf({ suggestions: {}, reason: null, document_warning: "receipt" }),
    ).toBeNull();
    expect(
      documentWarningOf({ suggestions: {}, reason: null, document_warning: "selfie" }),
    ).toBeNull();
    expect(documentWarningOf({ suggestions: {}, reason: null })).toBeNull();
    expect(documentWarningOf(null)).toBeNull();
  });

  it("says what it looks like and asks for a check, naming what the form expects", () => {
    expect(documentWarningText("bank_payment_confirmation", "receipt")).toBe(
      "This looks like a bank payment confirmation, not a receipt. Check that you've attached the receipt or invoice before you save.",
    );
    expect(documentWarningText("bank_payment_confirmation", "invoice")).toBe(
      "This looks like a bank payment confirmation, not an invoice. Check that you've attached the receipt or invoice before you save.",
    );
    expect(documentWarningText("other", "receipt")).toBe(
      "This doesn't look like a receipt or invoice. Check the file before you save.",
    );
    expect(documentWarningText("unreadable", "invoice")).toBe(
      "This document is hard to read. Check it, or attach a clearer copy.",
    );
  });
});

describe("a file holding several documents - the only refusal (the user, 2026-11-25)", () => {
  it("reads that refusal out of an answer, and nothing else", () => {
    expect(evidenceRefusalOf({ suggestions: null, reason: "several_documents" })).toBe(
      "several_documents",
    );
    // the description is not mandatory: an older API's refusal is no refusal here
    expect(evidenceRefusalOf({ suggestions: null, reason: "no_description" })).toBeNull();
    expect(evidenceRefusalOf({ suggestions: null, reason: "timeout" })).toBeNull();
    expect(evidenceRefusalOf({ suggestions: { a: 1 }, reason: "several_documents" })).toBeNull();
    expect(evidenceRefusalOf(null)).toBeNull();
    // not the quiet "couldn't read" line
    expect(failureOf({ suggestions: null, reason: "several_documents" })).toBe(false);
  });

  it("says why in the user's words, naming what was read", () => {
    expect(severalDocuments("receipt")).toEqual({
      title: "More than one receipt",
      text: "This file seems to contain more than one receipt. Please upload one receipt per entry.",
    });
    expect(severalDocuments("invoice")).toEqual({
      title: "More than one invoice",
      text: "This file seems to contain more than one invoice. Please upload one invoice per entry.",
    });
  });
});

describe("the outlines after a read (the user, 2026-11-25)", () => {
  const read = (): ReaderState<V, F> =>
    outlined(
      { ...start(), values: { date: "2026-10-20", amount: "" }, marks: { date: "medium" } },
      { empty: ["amount"], check: ["date"] },
    );

  it("an empty field is red, a field to check orange, any other suggestion teal", () => {
    const s = read();
    expect(outlineOf(s, "amount")).toBe("empty");
    expect(outlineOf(s, "date")).toBe("check");
    expect(outlineRing(s, "amount")).toBe(EMPTY_RING);
    expect(outlineRing(s, "date")).toBe(CHECK_RING);
    const teal = outlined(s, { empty: [], check: [] });
    expect(outlineOf(teal, "date")).toBe("suggested");
    expect(outlineRing(teal, "date")).toBe(SUGGESTED_RING);
    expect(outlineOf(start(), "date")).toBeNull();
    expect(outlineRing(start(), "date")).toBe("");
    expect(EMPTY_RING).toBe("ring-2 ring-action-danger ring-offset-1");
    expect(CHECK_RING).toBe("ring-2 ring-status-warning-ink ring-offset-1");
    expect(PLEASE_CHECK).toBe("Please check");
  });

  it("only a suggested field is outlined to check", () => {
    const s = outlined(start(), { empty: [], check: ["date"] });
    expect(outlineOf(s, "date")).toBeNull();
  });

  it("an edit takes the outline away; Clear takes the orange; a used note the red", () => {
    const s = read();
    expect(outlineOf(edited(s, "amount", { amount: "12" }, SPEC), "amount")).toBeNull();
    expect(outlineOf(edited(s, "date", { date: "2026-10-21" }, SPEC), "date")).toBeNull();
    expect(outlineOf(cleared(s, "date", SPEC), "date")).toBeNull();
    const noted: ReaderState<V, F> = {
      ...s,
      notes: { amount: { text: "x", fill: { amount: "50" }, band: "medium" } },
    };
    expect(outlineOf(usedNote(noted, "amount"), "amount")).toBe("suggested");
  });

  it("another document takes every outline back", () => {
    const fresh = withoutSuggestions(read(), SPEC);
    expect(outlineOf(fresh, "amount")).toBeNull();
    expect(outlineOf(fresh, "date")).toBeNull();
  });
});
