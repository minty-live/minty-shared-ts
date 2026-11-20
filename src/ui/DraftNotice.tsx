"use client";

/**
 * "You have unsaved changes from 10:42." - shown above a form that has an auto-saved draft
 * (`useAutoSaveDraft`, `@minty/shared/drafts`). Nothing changes until the person picks Restore or
 * Discard (the user's choice, 2026-11-20: ask first). When the record was saved again since the
 * draft was taken (`stale`), the draft is never put back: Show what I typed lists it, read-only.
 *
 * Info tone (the Part 14 Inline alert's tokens), `role=status`, no focus taken; two 44px buttons,
 * full width and stacked on a phone, side by side from `sm`.
 */

import { useState } from "react";

import { formatDay } from "../lib/dates";
import { Button } from "./Button";

/** A clock, drawn inline: not every app loads the Material Symbols font (onboarding does not). */
function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="mt-px size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/** "10:42" today, "18 Nov 2026, 10:42" another day - this browser's own clock, as the draft is. */
export function draftTimeText(savedAt: number, now: Date = new Date()): string {
  const at = new Date(savedAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return day(at) === day(now) ? time : `${formatDay(day(at))}, ${time}`;
}

export function DraftNotice({
  savedAt,
  stale = false,
  missing = [],
  onRestore,
  onDiscard,
  describe,
  className,
}: {
  savedAt: number;
  /** True: saved again since. "locked": the person can no longer change the record. Either way
   *  the draft is only shown, never put back. */
  stale?: boolean | "locked";
  missing?: readonly string[];
  onRestore: () => void;
  onDiscard: () => void;
  /** What the draft holds, for Show what I typed (a stale draft). */
  describe?: () => { label: string; value: string }[];
  className?: string;
}) {
  const [shown, setShown] = useState(false);
  const when = draftTimeText(savedAt);
  const rows = shown && describe ? describe() : [];
  return (
    <div
      role="status"
      data-draft-notice={stale === "locked" ? "locked" : stale ? "stale" : "fresh"}
      className={`flex min-w-0 items-start gap-3 rounded-md bg-status-info-bg p-3 text-status-info-ink${className ? ` ${className}` : ""}`}
    >
      <ClockIcon />
      <div className="min-w-0 flex-1 text-body-m">
        <p className="[overflow-wrap:anywhere]">
          {stale === "locked"
            ? `You can't change this any more, so we haven't put back your unsaved changes from ${when}.`
            : stale
              ? `This was saved again after your unsaved changes from ${when}, so we haven't put them back.`
              : `You have unsaved changes from ${when}.`}
          {!stale && missing.length ? " Some files weren't kept. Add them again." : ""}
        </p>
        {rows.length ? (
          <dl className="mt-2 grid min-w-0 grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-[max-content_1fr]">
            {rows.map((r) => (
              <div key={r.label} className="contents">
                <dt className="font-semibold">{r.label}</dt>
                <dd className="min-w-0 [overflow-wrap:anywhere]">{r.value || "—"}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          {stale ? (
            describe ? (
              <Button
                type="button"
                kind="secondary"
                full
                className="sm:w-auto"
                aria-expanded={shown}
                onClick={() => setShown((s) => !s)}
              >
                {shown ? "Hide what I typed" : "Show what I typed"}
              </Button>
            ) : null
          ) : (
            <Button type="button" kind="secondary" full className="sm:w-auto" onClick={onRestore}>
              Restore
            </Button>
          )}
          <Button type="button" kind="ghost" full className="sm:w-auto" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      </div>
    </div>
  );
}
