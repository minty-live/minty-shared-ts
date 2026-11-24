"use client";

/**
 * Puts an auto-saved draft back (`useAutoSaveDraft`, `@minty/shared/drafts`) the moment the form
 * has one - no question, nothing drawn (the user, 2026-11-24: "directly restore, no need to ask";
 * it replaced v0.28's `DraftNotice`, "You have unsaved changes from 10:42" - Restore / Discard).
 *
 * A stale draft (the record was saved again since) or a "locked" one (the person can no longer
 * change the record) is dropped silently - never put back over someone's save. Files too large to
 * keep are simply not among the restored ones.
 *
 * Mount it while the hook offers a draft: `offer ? <DraftRestore stale={offer.stale}
 * onRestore={...restore()...} onDiscard={discard} /> : null`. It acts once per mount (a ref, so
 * Strict Mode's second effect run does nothing).
 */

import { useEffect, useRef } from "react";

export function DraftRestore({
  stale = false,
  onRestore,
  onDiscard,
}: {
  /** True: saved again since. "locked": the person can no longer change the record. */
  stale?: boolean | "locked";
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const done = useRef(false);
  const latest = useRef({ stale, onRestore, onDiscard });
  useEffect(() => {
    latest.current = { stale, onRestore, onDiscard };
  });
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const now = latest.current;
    if (now.stale) now.onDiscard();
    else now.onRestore();
  }, []);
  return null;
}
