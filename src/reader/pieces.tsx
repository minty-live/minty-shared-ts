/**
 * The document reader's pieces in the classic look (every app's `main`/`development`): the teal
 * "Reading..." box, the line under a suggested field with Clear, the grey note offering a different
 * reading, and the one quiet failure line. Lifted from minty-petty-cash-web's ReceiptReader.tsx
 * (Flask's classic page before it), in the Part 13 colour roles from `colors.css` (one palette
 * for every app, owner 2026-11-18). Each app passes its own words. Text read off a document is drawn as
 * text, never as markup.
 */

import { outlineOf, type ReaderState } from "./core";

/** The ring on a field holding an untouched suggestion (Flask's teal ring, in the Part 13 selected border). */
export const SUGGESTED_RING = "ring-2 ring-border-selected ring-offset-1";

/** A field a read left empty (the user, 2026-11-25): red, a warning only - saving is never blocked by it. */
export const EMPTY_RING = "ring-2 ring-action-danger ring-offset-1";

/** A suggestion to look at again (the user, 2026-11-25): the orange "Please check" outline. */
export const CHECK_RING = "ring-2 ring-status-warning-ink ring-offset-1";

/** The line under a field outlined orange. */
export const PLEASE_CHECK = "Please check";

const RINGS = { empty: EMPTY_RING, check: CHECK_RING, suggested: SUGGESTED_RING } as const;

/** The ring for a field's outline (`outlineOf`), or "". */
export function outlineRing<V, F extends string>(state: ReaderState<V, F>, field: F): string {
  const outline = outlineOf(state, field);
  return outline ? RINGS[outline] : "";
}

/** While the document is read (QA found 12px grey text was missed; the wait is seconds). */
export function ReadingNotice({ title, detail }: { title: string; detail: string }) {
  return (
    <div
      role="status"
      className="mb-1 mt-3 flex items-center gap-3 rounded-[12px] border border-border-selected bg-state-selected px-4 py-3"
    >
      <svg
        className="h-5 w-5 shrink-0 animate-spin text-text-link"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-link">{title}</p>
        <p className="text-xs text-text-muted">{detail}</p>
      </div>
    </div>
  );
}

/**
 * The press that starts a read (owner, 2026-11-18): a document is never read on attaching it, only
 * when the person asks. Secondary, never the form's primary action (Brand is never a fill): white,
 * the reader's teal border and label, radius 12, 44px tall. `type="button"` - it never submits.
 */
export function ReadButton({
  label,
  onClick,
  disabled = false,
  describedBy,
}: {
  label: string;
  onClick: () => void;
  /** The company's AI reads are used up (owner, 2026-11-18): the reason sits beside it. */
  disabled?: boolean;
  /** The id of the allowance line beside the button (`AllowanceNote`). */
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-describedby={describedBy}
      className="mb-1 mt-3 inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-[12px] border border-action-secondary-border bg-surface-card px-4 py-2 text-left text-sm font-semibold text-action-secondary-text hover:bg-state-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus disabled:cursor-not-allowed disabled:border-border-default disabled:bg-action-disabled disabled:text-text-disabled disabled:hover:bg-action-disabled"
    >
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.4 6.2L21 10l-6.6 1.8L12 18l-2.4-6.2L3 10l6.6-1.8L12 2z" />
      </svg>
      <span className="min-w-0 break-words">{label}</span>
    </button>
  );
}

/**
 * Under a suggested field: the sparkle, the app's "<Field> suggested" text, and Clear. Its id goes
 * in the field's aria-describedby, so the line is read with the field. `tone="check"`: the field
 * is outlined orange, and the line is in the warning ink (the user, 2026-11-25).
 */
export function SuggestedLine({
  id,
  text,
  clearLabel,
  onClear,
  tone = "suggested",
}: {
  id: string;
  text: string;
  clearLabel: string;
  onClear: () => void;
  tone?: "suggested" | "check";
}) {
  const ink = tone === "check" ? "text-status-warning-ink" : "text-text-link";
  return (
    <div className={`mt-1.5 flex flex-wrap items-center gap-x-1.5 text-sm ${ink}`}>
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.4 6.2L21 10l-6.6 1.8L12 18l-2.4-6.2L3 10l6.6-1.8L12 2z" />
      </svg>
      <span id={id}>{text}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={clearLabel}
        className="min-h-11 min-w-11 cursor-pointer font-medium underline hover:no-underline"
      >
        Clear
      </button>
    </div>
  );
}

/** The grey note with one action: the document reads something else, or names an unknown supplier. */
export function ReaderNote({
  text,
  action,
  onAction,
}: {
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="mt-2 rounded-[8px] border border-border-default bg-surface-sunk px-3 py-2.5 text-sm">
      <p className="break-words text-text-secondary">{text}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-1 min-h-11 cursor-pointer break-words text-left font-medium text-text-link underline hover:no-underline"
      >
        {action}
      </button>
    </div>
  );
}

/**
 * The one quiet failure line (owner, 2026-11-04): a started read came back with nothing - Part 11's
 * issue then action, e.g. "I couldn't read this receipt. Enter the details yourself." Polite, never
 * an alert: the form works as it did.
 */
export function ReadFailedLine({ text }: { text: string }) {
  return (
    <p role="status" className="mb-1 mt-3 break-words text-sm text-text-secondary">
      {text}
    </p>
  );
}

/**
 * The owner's caution, in both apps (Petty Cash expense, Payment Request bill): under the fields
 * once a read has filled any, until the line is saved. One sentence since 2026-11-23 (owner) - the
 * "check every field" and exchange-rate sentences are gone. In the warning amber (the user,
 * 2026-11-23), but not an alert; the form puts its id in the save button's aria-describedby so it
 * is read there.
 */
export const AI_CAUTION = "AI suggestions may be inaccurate.";

export function AiCaution({ id }: { id: string }) {
  return (
    <p id={id} className="mb-1 mt-3 break-words text-sm text-status-warning-ink">
      {AI_CAUTION}
    </p>
  );
}
