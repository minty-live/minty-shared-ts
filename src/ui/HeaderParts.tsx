/**
 * The two pieces every app's header bar shares (the user, 2026-11-27: "apps must be consistent"):
 *
 * - `HeaderBack`: "‹ Back" at the bar's left. Grey at rest; on hover the arrow and the word turn
 *   teal together and only the word is underlined, never the arrow. A real link whose plain click
 *   goes back to where the person came from (`BackLink`), a plain link (`direct`), or a button
 *   when the page decides (`onClick`).
 * - `HeaderCompany`: the company the page is about, at the bar's right before the initials - the
 *   building and the name, which gives way (truncates) before the way back and the title do.
 *
 * Both glyphs are inline SVG (Material Symbols Rounded 400), not the icon font: the apps load
 * different icon fonts (outlined in minty-web and Payment Request, rounded in Petty Cash), and the
 * header must read the same in each.
 */

import type { ReactNode } from "react";

import { BackLink, type BackOptions } from "../lib/backLink";

const CHEVRON_LEFT =
  "m406-481 177 177q9 9 8.5 21t-9.5 21q-9 9-21.5 9t-21.5-9L341-460q-5-5-7-10t-2-11q0-6 2-11t7-10l199-199q9-9 21.5-9t21.5 9q9 9 9 21.5t-9 21.5L406-481Z";
const CORPORATE_FARE =
  "M140-120q-24.75 0-42.37-17.63Q80-155.25 80-180v-600q0-24.75 17.63-42.38Q115.25-840 140-840h270q24.75 0 42.38 17.62Q470-804.75 470-780v105h350q24.75 0 42.38 17.62Q880-639.75 880-615v435q0 24.75-17.62 42.37Q844.75-120 820-120H140Zm0-60h270v-105H140v105Zm0-165h270v-105H140v105Zm0-165h270v-105H140v105Zm0-165h270v-105H140v105Zm330 495h350v-435H470v435Zm110-270q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h105q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H580Zm0 165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h105q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H580Z";

function Glyph({ d, className }: { d: string; className: string }) {
  return (
    <svg
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <path d={d} />
    </svg>
  );
}

/** The way back's look - one string, so a test or a caller's wrapper can match it. */
export const HEADER_BACK_CLASS =
  "group -ml-1 inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-[12px] pr-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus sm:text-base";

export function HeaderBack({
  label = "Back",
  href,
  direct = false,
  onClick,
  ariaLabel,
  skip,
  leaveApp,
}: {
  /** The word after the arrow. */
  label?: ReactNode;
  /** The fallback address: what a new tab or a middle-click opens. */
  href?: string;
  /** Go to `href` itself, not to where the person came from. */
  direct?: boolean;
  /** No address: the page decides what Back does (a button). */
  onClick?: () => void;
  /** The control's name when the word alone does not say where it goes. */
  ariaLabel?: string;
} & BackOptions) {
  const body = (
    <>
      <Glyph d={CHEVRON_LEFT} className="h-[22px] w-[22px] sm:h-6 sm:w-6" />
      <span className="group-hover:underline">{label}</span>
    </>
  );
  if (href === undefined) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={HEADER_BACK_CLASS}>
        {body}
      </button>
    );
  }
  if (direct) {
    return (
      <a href={href} aria-label={ariaLabel} className={HEADER_BACK_CLASS}>
        {body}
      </a>
    );
  }
  return (
    <BackLink
      href={href}
      skip={skip}
      leaveApp={leaveApp}
      ariaLabel={ariaLabel}
      className={HEADER_BACK_CLASS}
    >
      {body}
    </BackLink>
  );
}

export function HeaderCompany({ name }: { name: string }) {
  return (
    <>
      <Glyph
        d={CORPORATE_FARE}
        className="h-[22px] w-[22px] text-text-secondary sm:h-[26px] sm:w-[26px]"
      />
      {/* A plain 6.5rem, not min(100%,6.5rem): a percentage cap counts as no cap while the
          shrink-0 block around it is sized, so on a phone a long name covered the way back. */}
      <span className="min-w-0 max-w-[6.5rem] truncate text-sm font-medium text-text-secondary sm:max-w-[9rem] sm:text-base md:max-w-[14rem] lg:max-w-md">
        {name}
      </span>
    </>
  );
}
