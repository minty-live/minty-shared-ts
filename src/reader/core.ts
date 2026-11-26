/**
 * The document reader's rules, shared by every form that reads an attached document with the model
 * (owner, 2026-11-04): Petty Cash's Add New Expense reads a receipt, Payment Request's new-bill form
 * an invoice. Lifted from minty-petty-cash-web's `lib/expenseAi.ts` (Flask's `expense_ai.js` before
 * it) and made generic over a form's own fields; each app keeps its field rules and its words.
 *
 *   Reading      a document is attached and being read  -> a notice; the form stays usable
 *   Suggested    a value came back with `applied: true`  -> filled into an EMPTY field, marked
 *   Confirmed    the person changes the field            -> the marking goes, the field is theirs
 *   Blank        low band (`applied: false`)             -> never filled; at most a note offering it
 *   Failed       a started read did not answer usefully  -> one quiet line (`failureOf`)
 *   Off          the API says the reader is switched off -> nothing at all, for the session
 *
 * NEVER OVERWRITE THE PERSON: a field holding a value when the answer arrives is left alone, and the
 * document's different reading is only offered. One exception, by decision: a field still at the
 * form's own DEFAULT that the person has not touched (today's date, the default account) counts as
 * empty - `touched` records every field the person changed, even back to the same value.
 * SUBMIT IS NEVER BLOCKED: the read runs beside the form, and nothing is written until the person
 * saves (the API writes nothing either).
 */

import { formatDay } from "../lib/dates";
import { formatAmount, formatMoney } from "../lib/money";

export type Band = "high" | "medium" | "low";

/** One read field: the value, the model's confidence (0-1), its band, and whether to prefill. */
export type ReadField = { value: string; confidence: number; band: Band; applied: boolean };

/** What an extract route answers: suggestions, or null and a reason code. */
export type ExtractAnswer<S = Record<string, unknown>> = {
  suggestions: S | null;
  reason: string | null;
};

/** The reader is switched off (`*_ENABLED`) or not configured: say nothing, for the session. */
export const READER_OFF_REASONS: readonly string[] = ["disabled", "not_configured"];

/**
 * A started read that came back with nothing to offer - the quiet failure line's cases. `no_context`
 * (the company has no accounts or suppliers to choose from) is not a failure of the read: nothing.
 */
export const FAILURE_REASONS: readonly string[] = [
  "rate_limited",
  "file_too_large",
  "unsupported_file",
  "provider_error",
  "timeout",
  "safety_blocked",
  "truncated",
  "invalid_reply",
  "no_usable_field",
];

/**
 * The model answered, but the file holds several receipts or invoices - the only refusal (the user,
 * 2026-11-25; the description is not mandatory, so `no_description` is gone). Not a failure: the
 * form says why (`useDocumentReader`'s `onRefused`), nothing is filled and the document stays.
 */
export type EvidenceRefusal = "several_documents";
export const EVIDENCE_REASONS: readonly EvidenceRefusal[] = ["several_documents"];

/** The answer's refusal, or null - only for an answer with no suggestions. */
export function evidenceRefusalOf(answer: unknown): EvidenceRefusal | null {
  if (!answer || typeof answer !== "object" || suggestionsOf(answer)) return null;
  const reason = (answer as { reason?: unknown }).reason;
  return EVIDENCE_REASONS.find((r) => r === reason) ?? null;
}

/** What a read names the document it reads. */
export type ReadDocument = "receipt" | "invoice";

const articled = (document: ReadDocument) => (document === "invoice" ? "an invoice" : "a receipt");

/** The pop-up for several documents in one file (the user's words, 2026-11-25; "file", not "image": a PDF reads too). */
export function severalDocuments(document: ReadDocument): { title: string; text: string } {
  return {
    title: `More than one ${document}`,
    text: `This file seems to contain more than one ${document}. Please upload one ${document} per entry.`,
  };
}

/**
 * What the read says the document may be instead of a receipt or invoice (the user, 2026-11-24):
 * a WARNING beside whatever it filled, never a refusal - the person checks the file and saves as
 * before. A receipt and an invoice are both fine in either form.
 */
export type DocumentWarning = "bank_payment_confirmation" | "other" | "unreadable";
const DOCUMENT_WARNINGS: readonly DocumentWarning[] = [
  "bank_payment_confirmation",
  "other",
  "unreadable",
];

/** The answer's document warning, or null (none, or a value this side doesn't know). */
export function documentWarningOf(answer: unknown): DocumentWarning | null {
  if (!answer || typeof answer !== "object") return null;
  const value = (answer as { document_warning?: unknown }).document_warning;
  return DOCUMENT_WARNINGS.find((w) => w === value) ?? null;
}

/** The warning's line (Part 11: what it looks like, then the check), naming what the form expects. */
export function documentWarningText(warning: DocumentWarning, document: ReadDocument): string {
  if (warning === "bank_payment_confirmation")
    return `This looks like a bank payment confirmation, not ${articled(document)}. Check that you've attached the receipt or invoice before you save.`;
  if (warning === "other")
    return "This doesn't look like a receipt or invoice. Check the file before you save.";
  return "This document is hard to read. Check it, or attach a clearer copy.";
}

/** The answer as data this side trusts the shape of, or null (anything else is "no suggestions"). */
export function suggestionsOf<S = Record<string, unknown>>(answer: unknown): S | null {
  if (!answer || typeof answer !== "object") return null;
  const s = (answer as { suggestions?: unknown }).suggestions;
  return s && typeof s === "object" ? (s as S) : null;
}

/**
 * Whether an answer with no suggestions is a failure the person is told about (one quiet line),
 * rather than silence (switched off, nothing to choose from). An answer WITH suggestions is never a
 * failure here: whether it showed anything is the form's to say (`useDocumentReader`'s
 * `onSuggestions` returns it) - a low-band reading offered as a note is not "couldn't read".
 */
export function failureOf(answer: unknown): boolean {
  if (suggestionsOf(answer)) return false;
  const reason = (answer as { reason?: unknown } | null)?.reason;
  return typeof reason !== "string" || FAILURE_REASONS.includes(reason);
}

// ---------------------------------------------------------------------------------------------
// What a failed read tells the person (the user, 2026-11-26)

/**
 * A read that came back with nothing, by what the person can do about it:
 *   unreadable   the model erred, timed out, replied unusably, or the connection dropped -> try again
 *   busy         rate limited                                                       -> try again later
 *   too_large    the file is over the company's limit                               -> nothing to retry
 *   unavailable  the reader is off, not set up, or the company has no lists yet     -> nothing to retry
 * (Before 2026-11-26 every one was the same quiet line, and the last was silence.)
 */
export type ReadFailureKind = "unreadable" | "busy" | "too_large" | "unavailable";
export type ReadFailure = { kind: ReadFailureKind; maxFileMb: number | null };

/** The person may press Try again this many times for one document (the user, 2026-11-26). */
export const MAX_READ_RETRIES = 2;

/** Failures a second try can mend. */
export const RETRYABLE_FAILURES: readonly ReadFailureKind[] = ["unreadable", "busy"];

/** The reader is not there for this company: off, not set up, or nothing to choose from. */
export const UNAVAILABLE_REASONS: readonly string[] = [...READER_OFF_REASONS, "no_context"];

/** The limit when an answer does not name one (`ai_policy.max_file_mb`'s default). */
const DEFAULT_MAX_FILE_MB = 10;

/**
 * The answer's failure, or null: an answer with suggestions, the allowance used up
 * (`limit_reached`, which the button's note says), a refusal (`several_documents`), or a reason
 * this side does not know are never one. No answer at all (a cut connection) is `unreadable`.
 */
export function readFailureOf(answer: unknown): ReadFailure | null {
  if (suggestionsOf(answer)) return null;
  const body = answer && typeof answer === "object" ? (answer as Record<string, unknown>) : {};
  const reason = body.reason;
  const max = typeof body.max_file_mb === "number" ? body.max_file_mb : null;
  if (typeof reason !== "string") return { kind: "unreadable", maxFileMb: null };
  if (reason === "rate_limited") return { kind: "busy", maxFileMb: null };
  if (reason === "file_too_large") return { kind: "too_large", maxFileMb: max };
  if (UNAVAILABLE_REASONS.includes(reason)) return { kind: "unavailable", maxFileMb: null };
  if (FAILURE_REASONS.includes(reason)) return { kind: "unreadable", maxFileMb: null };
  return null;
}

/**
 * The sentence for a failure (the user's words, 2026-11-26). Once the tries are used up, the
 * sentence no longer offers one.
 */
export function readFailureText(
  failure: ReadFailure,
  document: ReadDocument,
  canRetry: boolean,
): string {
  switch (failure.kind) {
    case "unreadable":
      return canRetry
        ? `Minty couldn't read this ${document}. Please try again or fill in the details.`
        : `Minty couldn't read this ${document}. Please fill in the details.`;
    case "busy":
      return canRetry
        ? "Minty is busy. Please try again in a minute."
        : "Minty is busy. Please fill in the details.";
    case "too_large":
      return `This file is too large (max ${failure.maxFileMb ?? DEFAULT_MAX_FILE_MB} MB).`;
    case "unavailable":
      return "Minty isn't available for this company yet.";
  }
}

// ---------------------------------------------------------------------------------------------
// The session latch

export type ReaderLatch = {
  /** Whether the reader has said it is off in this browser session (tab). */
  readerOff(): boolean;
  /** Notes an answer: an off reason switches the reader off for the session. */
  noteAnswer(answer: { reason?: string | null } | null): void;
  /** Tests only: forget the in-memory latch. */
  reset(): void;
};

/**
 * The app can't know in advance whether the reader is switched on (the API's setting): it learns
 * from a `disabled` answer and then gets out of the way for the rest of the session. One latch per
 * reader (`key` in sessionStorage), so a receipt reader's switch never silences an invoice reader.
 */
export function createReaderLatch(key: string): ReaderLatch {
  let latched = false;
  return {
    readerOff() {
      if (latched) return true;
      try {
        return sessionStorage.getItem(key) === "off";
      } catch {
        // Storage can be blocked (private mode, site data off): the in-memory latch still holds.
        return false;
      }
    },
    noteAnswer(answer) {
      if (!answer?.reason || !READER_OFF_REASONS.includes(answer.reason)) return;
      latched = true;
      try {
        sessionStorage.setItem(key, "off");
      } catch {
        // As above: the in-memory latch is enough for this page's life.
      }
    },
    reset() {
      latched = false;
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Nothing stored to forget.
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The form's state around its own values

/** A note under a field: the document reads something else (or, low band, might). Nothing moves without its button. */
export type ReadNote<V> = { text: string; fill: Partial<V>; band: Band };

export type ReaderState<V, F extends string> = {
  values: V;
  /** Fields holding an untouched suggestion, by band. */
  marks: Partial<Record<F, Band>>;
  notes: Partial<Record<F, ReadNote<V>>>;
  /** Fields the person has changed (even back to the same value): never treated as defaults. */
  touched: Partial<Record<F, true>>;
  /** A supplier name read off the document that is not on the list - offered for New Supplier. */
  detectedName: string | null;
  /** The one polite announcement of what the reading did ("" for nothing). */
  announcement: string;
  /**
   * After a read (the user, 2026-11-25; `outlined`): fields it left empty - the red outline, a
   * warning only - and suggested fields to check - the orange "Please check" outline. Optional, so
   * a state kept before them (an L1 draft) still reads.
   */
  empties?: Partial<Record<F, true>>;
  checks?: Partial<Record<F, true>>;
};

/** What a form tells the rules about its own fields. */
export type ReaderSpec<V, F extends string> = {
  /** A field's values after Clear (or after its document is replaced): a blank - or its default. */
  cleared: (field: F) => Partial<V>;
  /** Two values that mean the same (an amount grouped on blur): an edit that is no change. */
  same?: (field: F, before: V, after: V) => boolean;
  /**
   * A form with defaults: re-picking a field's current value still counts as touching it, so a
   * default the person confirmed is never replaced. Without defaults, the same value is no change.
   */
  touchOnSame?: boolean;
};

export function readerState<V, F extends string>(values: V): ReaderState<V, F> {
  return { values, marks: {}, notes: {}, touched: {}, detectedName: null, announcement: "" };
}

/**
 * The person changed a field: it is theirs now (Confirmed) - touched, its marking and its note go,
 * and for `supplierField` the offered name too. A change to the same value is no change; one the
 * form calls the same (`spec.same`) keeps the marking.
 */
export function edited<V, F extends string>(
  state: ReaderState<V, F>,
  field: NoInfer<F>,
  patch: Partial<V>,
  spec: ReaderSpec<V, F>,
  supplierField?: NoInfer<F>,
): ReaderState<V, F> {
  const values = { ...state.values, ...patch };
  const changed = (Object.keys(patch) as (keyof V)[]).some((k) => patch[k] !== state.values[k]);
  const touched = { ...state.touched, [field]: true as const };
  if (!changed) return spec.touchOnSame && !state.touched[field] ? { ...state, touched } : state;
  if (spec.same?.(field, state.values, values)) return { ...state, values, touched };
  const marks = { ...state.marks };
  const notes = { ...state.notes };
  delete marks[field];
  delete notes[field];
  return {
    ...without({ ...state, values, marks, notes, touched }, field, "empties", "checks"),
    detectedName: field === supplierField ? null : state.detectedName,
  };
}

/** `state` with `field` out of the named outline sets (each copied only when it holds the field). */
function without<V, F extends string>(
  state: ReaderState<V, F>,
  field: F,
  ...sets: ("empties" | "checks")[]
): ReaderState<V, F> {
  let next = state;
  for (const key of sets) {
    if (!state[key]?.[field]) continue;
    const set = { ...state[key] };
    delete set[field];
    next = { ...next, [key]: set };
  }
  return next;
}

/** Clear: a suggested field goes back to blank or its default, unmarked (only for a field still marked). */
export function cleared<V, F extends string>(
  state: ReaderState<V, F>,
  field: NoInfer<F>,
  spec: ReaderSpec<V, F>,
): ReaderState<V, F> {
  if (!state.marks[field]) return state;
  const marks = { ...state.marks };
  delete marks[field];
  return without(
    { ...state, values: { ...state.values, ...spec.cleared(field) }, marks },
    field,
    "checks",
  );
}

/** "Use the value from the document": the note's value goes in, marked as suggested. */
export function usedNote<V, F extends string>(
  state: ReaderState<V, F>,
  field: NoInfer<F>,
): ReaderState<V, F> {
  const note = state.notes[field];
  if (!note) return state;
  const notes = { ...state.notes };
  delete notes[field];
  return without(
    {
      ...state,
      values: { ...state.values, ...note.fill },
      marks: { ...state.marks, [field]: note.band },
      notes,
    },
    field,
    "empties",
  );
}

/** The offered supplier name was taken to New Supplier (or set aside): the offer goes. */
export function withoutDetectedName<V, F extends string>(
  state: ReaderState<V, F>,
): ReaderState<V, F> {
  return state.detectedName === null ? state : { ...state, detectedName: null };
}

/**
 * Another document (or none): the old one's suggestions go entirely - the VALUES of fields still
 * marked too (back to blank or default), or the never-overwrite rule would protect stale
 * suggestions as if typed. Fields the person changed are unmarked already and stay as they are.
 */
export function withoutSuggestions<V, F extends string>(
  state: ReaderState<V, F>,
  spec: ReaderSpec<V, F>,
): ReaderState<V, F> {
  let values = { ...state.values };
  for (const field of Object.keys(state.marks) as F[])
    values = { ...values, ...spec.cleared(field) };
  return {
    ...state,
    values,
    marks: {},
    notes: {},
    detectedName: null,
    announcement: "",
    empties: {},
    checks: {},
  };
}

/**
 * The outlines after a read (the user, 2026-11-25), named by the form: `empty` - fields the read
 * left empty (red, a warning only: never a gate on saving); `check` - suggested fields to look at
 * again (orange, "Please check"), e.g. an inferred description and its account, or a supplier not
 * on the list. A field to check that holds no suggestion is not outlined. Replaces earlier outlines.
 */
export function outlined<V, F extends string>(
  state: ReaderState<V, F>,
  { empty, check }: { empty: readonly NoInfer<F>[]; check: readonly NoInfer<F>[] },
): ReaderState<V, F> {
  const set = (fields: readonly F[]) =>
    Object.fromEntries(fields.map((f) => [f, true])) as Partial<Record<F, true>>;
  return { ...state, empties: set(empty), checks: set(check.filter((f) => state.marks[f])) };
}

/** A field's outline: red `empty`, orange `check`, teal `suggested`, or none. */
export type Outline = "empty" | "check" | "suggested";

export function outlineOf<V, F extends string>(
  state: ReaderState<V, F>,
  field: NoInfer<F>,
): Outline | null {
  if (state.empties?.[field]) return "empty";
  if (!state.marks[field]) return null;
  return state.checks?.[field] ? "check" : "suggested";
}

/**
 * Whether a suggestion may fill `field`: it is empty, or it still holds the form's default and the
 * person has not touched it. (`isBlank` is the form's own idea of an empty value.)
 */
export function fillable<V, F extends string>(
  state: ReaderState<V, F>,
  field: NoInfer<F>,
  isBlank: boolean,
  atDefault = false,
): boolean {
  return isBlank || (atDefault && !state.touched[field]);
}

// ---------------------------------------------------------------------------------------------
// The copy that is sent

const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;

/**
 * A photo resized in the browser before it is read: a phone photo is 8-12 MB, and 2000px on the
 * long edge is plenty to read a document. THIS COPY IS FOR READING ONLY - saving still sends the
 * untouched original (stored exactly as uploaded, owner 2026-11-04). A PDF, a small photo, or a
 * browser without the canvas APIs gets the file itself back; so does any failure.
 */
export async function readingCopy(file: File): Promise<Blob> {
  if (!/^image\/(jpe?g|png)$/i.test(file.type)) return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    // Only when it is actually smaller: a tiny detailed image can re-encode larger.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    // Unsupported, out of memory, a browser quirk: the original goes, and the server shrinks it.
    return file;
  }
}

// ---------------------------------------------------------------------------------------------
// An amount read in another currency (owner, 2026-11-19): the API converts it at Frankfurter v1's
// rate (the European Central Bank's) and says how in `exchange`; with no rate the amount comes back
// empty and `exchange_failed` names the currency. The six details travel with the saved line only
// while its amount is still the converted one.

export type Exchange = {
  original_currency: string;
  original_amount: string;
  rate: string;
  rate_date: string;
  date_basis: "receipt" | "report_date";
  source: string;
  /** The day asked for; a weekend or holiday moves `rate_date` back from it. */
  asked_date?: string;
};

const text = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/** The answer's `exchange`, or null for anything that isn't a whole one. */
export function exchangeOf(suggestions: unknown): Exchange | null {
  const ex = (suggestions as { exchange?: Partial<Exchange> } | null)?.exchange;
  if (!ex || typeof ex !== "object") return null;
  const { original_currency, original_amount, rate, rate_date, date_basis, source } = ex;
  if (![original_currency, original_amount, rate, rate_date, source].every(text)) return null;
  if (date_basis !== "receipt" && date_basis !== "report_date") return null;
  return { ...(ex as Exchange) };
}

/** The currency no rate was found for (the amount came back empty), or null. */
export function exchangeFailedOf(suggestions: unknown): string | null {
  const failed = (suggestions as { exchange_failed?: { currency?: unknown } } | null)
    ?.exchange_failed;
  return text(failed?.currency) ? failed.currency : null;
}

const amountNumber = (v: string): number | null => {
  const cleaned = v.replace(/[,\s]/g, ""); // \s covers the non-breaking space
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

/** Whether the amount field still holds the converted amount (grouping and trailing zeros aside). */
export function exchangeKept(amount: string, converted: string): boolean {
  const a = amountNumber(amount);
  const b = amountNumber(converted);
  return a !== null && b !== null && a === b;
}

/** The six details by the names a save sends (the line's columns). */
export function exchangeFields(ex: Exchange): Record<string, string> {
  return {
    original_currency: ex.original_currency,
    original_amount: ex.original_amount,
    exchange_rate: ex.rate,
    exchange_rate_date: ex.rate_date,
    exchange_rate_basis: ex.date_basis,
    exchange_rate_source: ex.source,
  };
}

/** `value` to 2 places, half up on its decimal digits (never the float's binary tail), grouped. */
function twoPlaces(value: number): string {
  const rounded = Number(`${Math.round(Number(`${value}e2`))}e-2`);
  return formatAmount(rounded.toFixed(2), 2);
}

/**
 * A rate as people read it (owner, 2026-11-24): "1 {stronger} = n {weaker}", so n is always 1 or
 * more - "1 USD = 7.85 HKD", "1 HKD = 7.43 PHP", "1 HKD = 171.51 KRW" - for any company currency,
 * 2 decimals, rounded. The stored rate (`ex.rate`, the company currency per 1 foreign unit, as the
 * API gives it) never changes; only the display flips.
 */
export function rateText(ex: Exchange, code: string): string {
  const rate = Number(ex.rate);
  return rate >= 1
    ? `1 ${ex.original_currency} = ${twoPlaces(rate)} ${code}`
    : `1 ${code} = ${twoPlaces(1 / rate)} ${ex.original_currency}`;
}

/**
 * Added after the description: "(USD 35.00 @ 1 USD = 7.85 HKD)" - the original amount and the
 * rate with both currencies named (owner, 2026-11-24; `rateText`). Plain spaces: the description
 * goes to Xero. `code` is the company's currency.
 */
export function exchangeNote(ex: Exchange, code: string): string {
  return `(${ex.original_currency} ${formatAmount(ex.original_amount, 2)} @ ${rateText(ex, code)})`;
}

/**
 * For the amount's suggested line: "converted from USD 12.34 at 1 USD = 7.85 HKD (13 Nov 2026
 * rate)" - the rate as `rateText` writes it, and, when a weekend or holiday moved the rate's day
 * back, why (", the last business day before 15 Nov 2026"). `code` is the company's currency;
 * without it no rate is shown (never one naming a single currency).
 */
export function convertedText(ex: Exchange, code?: string | null): string {
  const rate = code ? ` at ${rateText(ex, code)}` : "";
  const moved =
    ex.asked_date && ex.asked_date !== ex.rate_date
      ? `, the last business day before ${formatDay(ex.asked_date)}`
      : "";
  return `converted from ${formatMoney(ex.original_amount, ex.original_currency, 2)}${rate} (${formatDay(ex.rate_date)} rate${moved})`;
}
