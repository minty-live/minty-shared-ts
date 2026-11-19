"use client";

/**
 * The "Your session has expired" pop-up (the user, 2026-11-19), one for every app, drawn as
 * minty-web's question modal (`components/ui/ConfirmDialog.tsx`, Figma 04-G / section 06, the one
 * button case): a white card over the blurred page, the title with Minty beside it - the clock
 * cat - the sentence, and one centred teal OK. Escape and the backdrop do what OK does - there is
 * nothing else to choose. Focus, the focus trap and the scroll lock are the shared Modal's
 * (`useOverlayBehaviour`).
 *
 * - `SessionExpiredHost`: drawn once in each app's layout; it opens when a fetch helper calls
 *   `showSessionExpired(loginUrl)` (`@minty/shared/sessionExpired`) and OK goes to that login page.
 * - `SessionExpiredDialog`: the same pop-up driven by its props - minty-web's login screen shows it
 *   when it is reached with `?expired=1` (OK only closes it: the person is already there).
 *
 * The cat is a file each app serves (`SESSION_EXPIRED_ASSETS`).
 * The card's shadow is ConfirmDialog's own, not `shadow-modal`: minty-web and Payment Request web
 * load colors.css without tokens.css, where `--shadow-modal` lives.
 */

import { createPortal } from "react-dom";
import { useId, useRef, useSyncExternalStore } from "react";

import {
  SESSION_EXPIRED_CAT,
  sessionExpiredUrl,
  subscribeSessionExpired,
} from "../lib/sessionExpired";
import { useOverlayBehaviour } from "./Overlay";

export const SESSION_EXPIRED_TITLE = "Your session has expired";
export const SESSION_EXPIRED_TEXT =
  "You've been signed out after 60 minutes without activity, or you signed out. Sign in again to carry on.";

export function SessionExpiredDialog({ open, onOk }: { open: boolean; onOk: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const textId = useId();
  useOverlayBehaviour(open, panel, onOk);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* the backdrop: a click on it is OK too (the one button already says so) */}
      <div
        aria-hidden="true"
        onMouseDown={onOk}
        className="absolute inset-0 bg-white/60 backdrop-blur-[3px]"
      />
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        tabIndex={-1}
        className="relative max-h-full w-full min-w-0 max-w-[435px] overflow-y-auto rounded-[24px] border border-white/40 bg-white p-6 shadow-[0px_4px_8px_0px_rgba(15,23,42,0.08),0px_12px_32px_0px_rgba(0,0,0,0.1)] outline-none sm:p-12"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id={titleId}
            className="min-w-0 flex-1 text-[26px] font-bold leading-tight text-text-primary"
          >
            {SESSION_EXPIRED_TITLE}
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- a packaged component cannot use next/image's loader config */}
          <img
            src={SESSION_EXPIRED_CAT}
            alt=""
            data-image="clock"
            className="-mr-3 -mt-2 h-[112px] w-auto shrink-0 sm:h-[144px]"
          />
        </div>
        <p id={textId} className="mt-6 text-[15px] leading-snug text-text-secondary">
          {SESSION_EXPIRED_TEXT}
        </p>
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onOk}
            className="h-14 w-full rounded-[14px] border border-transparent bg-action-primary text-lg font-bold leading-tight text-white hover:bg-action-primary-hover active:bg-action-primary-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary sm:h-[66px] sm:w-[169px]"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function SessionExpiredHost() {
  const url = useSyncExternalStore(subscribeSessionExpired, sessionExpiredUrl, () => null);
  return (
    <SessionExpiredDialog
      open={url !== null}
      onOk={() => {
        if (url) window.location.href = url;
      }}
    />
  );
}
