/**
 * The company's AI allowance (owner, 2026-11-18): each company reads against its own grants (a
 * one-time grant on its first read, top-ups given by hand), shared by Petty Cash's receipts and
 * Payment Request's invoices, kept by the APIs (minty-shared-py's `ai_allowance`, minty-db's
 * `ai_policy`/`ai_grant`/`ai_read`). The page learns where it stands from the reader status its
 * API sends - on page load (`reader`) and after every read (the answer's `reader`). Once used up,
 * the read button is disabled with the reason beside it; while there is room nothing is shown (the
 * user, 2026-11-26: no "80% of your AI allowance left"). Only a read a model answered counts; a
 * failed one does not.
 */

/** What an API sends as `reader`. A switched-off reader sends `{enabled: false}` alone. */
export type ReaderStatus = {
  enabled: boolean;
  reads_used?: number | null;
  reads_limit?: number | null;
  reads_left?: number | null;
  /** How much of the company's open grants is left, 0-100. */
  percent_left?: number | null;
  /** Nothing left, or a cap reached: reading stops for the company. */
  blocked?: boolean;
  /** When a rolling window next has room (ISO); null = used up for good. */
  resumes_at?: string | null;
  /**
   * When the signed-in person's first read was answered (ISO), any company; null = never. Sizes
   * the reading cat (`readingCatSize`; the user, 2026-11-26).
   */
  first_read_at?: string | null;
};

/** The `reader` of an extract answer or a page payload, when it has the shape. */
export function readerStatusOf(payload: unknown): ReaderStatus | null {
  if (!payload || typeof payload !== "object") return null;
  const reader = (payload as { reader?: unknown }).reader;
  if (!reader || typeof reader !== "object") return null;
  const enabled = (reader as { enabled?: unknown }).enabled;
  return typeof enabled === "boolean" ? (reader as ReaderStatus) : null;
}

/** Whether "Read with AI" may be pressed: switched on and nothing used up. */
export function canRead(status: ReaderStatus | null | undefined): boolean {
  return !!status?.enabled && !status.blocked;
}

/** "19 Nov" in the viewer's own time zone. */
function shortDate(iso: string): string | null {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  return when.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * The line beside the button: only why reading stopped (used up, or paused until a date) - the
 * button is then disabled, and a gated button says why. While there is room nothing is said: no
 * "80% of your AI allowance left" or "7 of 10 left" (the user, 2026-11-26). Part 11: the
 * situation, then what to do.
 */
export function allowanceText(status: ReaderStatus | null | undefined): string | null {
  if (!status?.enabled || !status.blocked) return null;
  const until = status.resumes_at ? shortDate(status.resumes_at) : null;
  if (until) return `AI reading is paused until ${until}. Fill in the details yourself for now.`;
  return "Your company has used its AI allowance. Fill in the details yourself.";
}

/**
 * The reason beside a disabled read button (nothing while reading is open). Its id goes in the
 * button's aria-describedby, so a screen reader hears the reason with it.
 */
export function AllowanceNote({
  id,
  status,
}: {
  id: string;
  status: ReaderStatus | null | undefined;
}) {
  const text = allowanceText(status);
  if (!text) return null;
  return (
    <p id={id} className="mt-1 text-sm text-text-muted">
      {text}
    </p>
  );
}
