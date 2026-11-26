"use client";

/**
 * One read at a time (lifted from minty-petty-cash-web's `useReceiptReader`): a new document,
 * Cancel, saving or closing the form cancels the read in flight, and an answer for a document no
 * longer there is dropped (a token). `post` is the app's own call to its extract route, so its
 * auth and base URL stay the app's.
 *
 * `failure` says why a started read came back with nothing for the person (the user, 2026-11-26;
 * before, one quiet line for every case and silence when the reader was off) - `readFailureOf`'s
 * kinds, plus `unreadable` for a cut connection or an answer the form says showed nothing
 * (`onSuggestions` returning false). Never for an abort or a refusal. `failed` is `failure !== null`.
 * `retry` reads the same document again, at most `MAX_READ_RETRIES` times and only for a failure a
 * second try can mend; `dismiss` puts the message away ("Fill in manually").
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { readerStatusOf, type ReaderStatus } from "./allowance";
import {
  MAX_READ_RETRIES,
  RETRYABLE_FAILURES,
  documentWarningOf,
  evidenceRefusalOf,
  readFailureOf,
  readingCopy,
  suggestionsOf,
  type DocumentWarning,
  type EvidenceRefusal,
  type ReadFailure,
  type ReaderLatch,
} from "./core";

const UNREADABLE: ReadFailure = { kind: "unreadable", maxFileMb: null };

export type DocumentReaderOptions<S> = {
  /** Sends the form (the reading copy under `field`, with the document's own name) and returns the JSON answer. */
  post: (form: FormData, signal: AbortSignal) => Promise<unknown>;
  /** The multipart field the route reads ("receipt", "invoice"). */
  field: string;
  latch: ReaderLatch;
  /** Applies the suggestions; return false when nothing at all was shown. */
  onSuggestions: (suggestions: S) => boolean | void;
  /**
   * The company's AI reads after this read (the answer's `reader`; owner, 2026-11-18) - called
   * even when the person has moved on, since the read was made. `limit_reached` is not a failure:
   * the form disables the button and says why instead.
   */
  onStatus?: (status: ReaderStatus) => void;
  /**
   * The model answered, but the document is not one record of a payment (owner, 2026-11-23):
   * several in one file, or nothing describes what was paid for. The form says why; nothing is
   * filled, the document stays, and it is never the quiet failure line.
   */
  onRefused?: (reason: EvidenceRefusal) => void;
  /**
   * What the document may be instead of a receipt or invoice (the user, 2026-11-24), or null -
   * after every answered read, refused or not, so the form shows or clears its warning. A warning
   * never stops the suggestions filling.
   */
  onWarning?: (warning: DocumentWarning | null) => void;
};

export function useDocumentReader<S>({
  post,
  field,
  latch,
  onSuggestions,
  onStatus,
  onRefused,
  onWarning,
}: DocumentReaderOptions<S>) {
  const token = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [failure, setFailure] = useState<ReadFailure | null>(null);
  const [retries, setRetries] = useState(0);

  const cancel = useCallback(() => {
    token.current += 1;
    controller.current?.abort();
    controller.current = null;
    setReading(false);
    setFailure(null);
  }, []);

  const dismiss = useCallback(() => setFailure(null), []);

  // Unmounting drops whatever is in flight.
  useEffect(
    () => () => {
      token.current += 1;
      controller.current?.abort();
    },
    [],
  );

  /** A new read of `file`: the person's tries start again. */
  async function read(file: File) {
    setLastFile(file);
    setRetries(0);
    await run(file);
  }

  const canRetry =
    failure !== null &&
    RETRYABLE_FAILURES.includes(failure.kind) &&
    retries < MAX_READ_RETRIES &&
    lastFile !== null;

  /** Try again: the same document, counted against `MAX_READ_RETRIES`. */
  async function retry() {
    if (!canRetry || !lastFile) return;
    setRetries((n) => n + 1);
    await run(lastFile);
  }

  async function run(file: File) {
    cancel();
    if (latch.readerOff()) return;
    const mine = token.current;
    const abort = new AbortController();
    controller.current = abort;
    setReading(true);
    try {
      const copy = await readingCopy(file);
      if (mine !== token.current) return;
      const body = new FormData();
      // The bytes are the reading copy; the name stays the document's own.
      body.set(field, copy, file.name);
      const answer = await post(body, abort.signal);
      latch.noteAnswer(answer as { reason?: string | null } | null);
      const status = readerStatusOf(answer);
      if (status) onStatus?.(status);
      if (mine !== token.current) return;
      const suggestions = suggestionsOf<S>(answer);
      onWarning?.(documentWarningOf(answer));
      const refusal = evidenceRefusalOf(answer);
      if (refusal) onRefused?.(refusal);
      else if (suggestions) {
        if (onSuggestions(suggestions) === false) setFailure(UNREADABLE);
      } else setFailure(readFailureOf(answer));
    } catch (error) {
      // An abort is the person moving on - nothing to say. Anything else could not be read.
      if (
        mine === token.current &&
        !abort.signal.aborted &&
        (error as Error)?.name !== "AbortError"
      )
        setFailure(UNREADABLE);
    } finally {
      if (mine === token.current) {
        controller.current = null;
        setReading(false);
      }
    }
  }

  return {
    reading,
    failed: failure !== null,
    failure,
    canRetry,
    retriesLeft: MAX_READ_RETRIES - retries,
    read,
    retry,
    dismiss,
    cancel,
  };
}
