"use client";

/**
 * One read at a time (lifted from minty-petty-cash-web's `useReceiptReader`): a new document,
 * Cancel, saving or closing the form cancels the read in flight, and an answer for a document no
 * longer there is dropped (a token). `post` is the app's own call to its extract route, so its
 * auth and base URL stay the app's.
 *
 * `failed` is the one quiet failure line's switch (owner, 2026-11-04): set when a started read
 * comes back with nothing for the person - a failure reason, a cut connection, a refusal, or an
 * answer the form says showed nothing (`onSuggestions` returning false). Never for an abort, and
 * never when the reader is switched off (the latch then keeps it out of the way for the session).
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { readerStatusOf, type ReaderStatus } from "./allowance";
import {
  evidenceRefusalOf,
  failureOf,
  readingCopy,
  suggestionsOf,
  type EvidenceRefusal,
  type ReaderLatch,
} from "./core";

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
};

export function useDocumentReader<S>({
  post,
  field,
  latch,
  onSuggestions,
  onStatus,
  onRefused,
}: DocumentReaderOptions<S>) {
  const token = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const [reading, setReading] = useState(false);
  const [failed, setFailed] = useState(false);

  const cancel = useCallback(() => {
    token.current += 1;
    controller.current?.abort();
    controller.current = null;
    setReading(false);
    setFailed(false);
  }, []);

  // Unmounting drops whatever is in flight.
  useEffect(
    () => () => {
      token.current += 1;
      controller.current?.abort();
    },
    [],
  );

  async function read(file: File) {
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
      if (latch.readerOff()) return;
      const suggestions = suggestionsOf<S>(answer);
      const refusal = evidenceRefusalOf(answer);
      if (refusal) onRefused?.(refusal);
      else if (suggestions) {
        if (onSuggestions(suggestions) === false) setFailed(true);
      } else if (failureOf(answer)) setFailed(true);
    } catch (error) {
      // An abort is the person moving on - nothing to say. Anything else is the quiet line.
      if (
        mine === token.current &&
        !abort.signal.aborted &&
        (error as Error)?.name !== "AbortError"
      )
        setFailed(true);
    } finally {
      if (mine === token.current) {
        controller.current = null;
        setReading(false);
      }
    }
  }

  return { reading, failed, read, cancel };
}
