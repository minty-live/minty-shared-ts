/**
 * The "Talk to Minty" cat and chat in the two designs - the same rule as `../sidebar/looks.ts`:
 *
 * - `v2` - Part 13 semantic tokens (every `redesign` branch loads `tokens.css`).
 * - `classic` - the same colour roles from `colors.css` (one palette for every app, owner
 *   2026-11-18; every app loads `colors.css` or `tokens.css`), with its own shadows written in
 *   (the shadow scale is `tokens.css`'s, which the classic apps do not all load). A picked
 *   choice's ring and dot are Minty Action, like a checked tick box.
 *
 * Geometry is shared and lives in the components; only colour, border and shadow differ here.
 * The cat itself stands on the page with no button behind it (owner, 2026-11-05) - only its
 * focus ring is per look. `tab` is what is left on the screen's edge once the cat is tucked
 * away (v0.15; the pop-up's close, drawn in `close`, tucks it).
 */

import type { Look } from "../sidebar/looks";

export const CONTACT_LOOK = {
  v2: {
    cat: "focus-visible:outline-border-focus",
    tab: "bg-surface-raised border border-border-default shadow-modal hover:bg-state-hover focus-visible:outline-border-focus",
    popup: "bg-surface-raised border border-border-default shadow-modal",
    popupTail: "bg-surface-raised border-r border-b border-border-default",
    popupGreeting: "text-text-primary",
    popupItem: "text-text-primary hover:bg-state-hover focus-visible:outline-border-focus",
    popupIcon: "text-text-link",
    window: "bg-surface-page sm:border sm:border-border-default sm:shadow-modal",
    header: "border-b border-border-subtle bg-surface-raised",
    title: "text-text-primary",
    subtitle: "text-text-secondary",
    close: "text-text-secondary hover:bg-state-hover focus-visible:outline-border-focus",
    minty: "bg-surface-raised border border-border-subtle text-text-primary",
    me: "bg-state-selected text-text-primary",
    chip: "border border-border-selected text-text-link bg-surface-raised hover:bg-state-hover focus-visible:outline-border-focus",
    composer: "border-t border-border-subtle bg-surface-raised",
    label: "text-text-secondary",
    field:
      "border border-border-input bg-surface-card text-text-primary focus:border-border-selected focus:ring-1 focus:ring-border-selected/25",
    fieldInvalid: "border-2! border-action-danger! focus:ring-action-danger/25!",
    problem: "text-status-danger-ink",
    counter: "text-text-secondary",
    primary:
      "bg-action-primary text-action-on-primary hover:bg-action-primary-hover active:bg-action-primary-pressed focus-visible:outline-border-focus",
    secondary:
      "border border-border-default bg-surface-raised text-text-primary hover:bg-state-hover focus-visible:outline-border-focus",
    dot: "bg-text-secondary",
    review: "border border-border-default bg-surface-raised",
    row: "border border-border-default bg-surface-raised text-text-primary hover:bg-state-hover",
    rowSelected: "border-border-selected! bg-state-selected!",
    rowFocus: "has-[:focus-visible]:outline-border-focus",
    rowMark: "text-text-secondary",
    radioOn: "border-border-selected",
    radioOff: "border-border-input",
    radioDot: "bg-border-selected",
    footer: "border-t border-border-subtle",
    footerAction: "text-text-link hover:bg-state-hover focus-visible:outline-border-focus",
  },
  classic: {
    cat: "focus-visible:outline-border-focus",
    tab: "bg-surface-raised border border-border-default shadow-[0_4px_14px_rgba(17,19,19,0.16)] hover:bg-state-hover focus-visible:outline-border-focus",
    popup: "bg-surface-raised border border-border-default shadow-[0_8px_28px_rgba(17,19,19,0.16)]",
    popupTail: "bg-surface-raised border-r border-b border-border-default",
    popupGreeting: "text-text-primary",
    popupItem: "text-text-primary hover:bg-state-hover focus-visible:outline-border-focus",
    popupIcon: "text-text-link",
    window:
      "bg-surface-page sm:border sm:border-border-default sm:shadow-[0_12px_40px_rgba(17,19,19,0.2)]",
    header: "border-b border-border-subtle bg-surface-raised",
    title: "text-text-primary",
    subtitle: "text-text-secondary",
    close: "text-text-secondary hover:bg-state-hover focus-visible:outline-border-focus",
    minty: "bg-surface-raised border border-border-subtle text-text-primary",
    me: "bg-state-selected text-text-primary",
    chip: "border border-border-selected text-text-link bg-surface-raised hover:bg-state-hover focus-visible:outline-border-focus",
    composer: "border-t border-border-subtle bg-surface-raised",
    label: "text-text-secondary",
    field:
      "border border-border-input bg-surface-card text-text-primary focus:border-border-selected focus:ring-1 focus:ring-border-selected/25",
    fieldInvalid: "border-2! border-action-danger! focus:ring-action-danger/25!",
    problem: "text-status-danger-ink",
    counter: "text-text-secondary",
    primary:
      "bg-action-primary text-action-on-primary hover:bg-action-primary-hover active:bg-action-primary-pressed focus-visible:outline-border-focus",
    secondary:
      "border border-border-default bg-surface-raised text-text-primary hover:bg-state-hover focus-visible:outline-border-focus",
    dot: "bg-text-secondary",
    review: "border border-border-default bg-surface-raised",
    row: "border border-border-default bg-surface-raised text-text-primary hover:bg-state-hover",
    rowSelected: "border-action-primary! bg-state-selected!",
    rowFocus: "has-[:focus-visible]:outline-border-focus",
    rowMark: "text-text-secondary",
    radioOn: "border-action-tick",
    radioOff: "border-border-input",
    radioDot: "bg-action-tick",
    footer: "border-t border-border-subtle",
    footerAction: "text-text-link hover:bg-state-hover focus-visible:outline-border-focus",
  },
} as const satisfies Record<Look, Record<string, string>>;

export type ContactLookClasses = (typeof CONTACT_LOOK)[Look];
