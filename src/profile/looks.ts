/**
 * My Profile's two designs (the owner, 2026-10-20) - the same rule as `../sidebar/looks.ts`:
 *
 * - `v2` - minty-web `development`'s profile, Part 13 semantic tokens.
 * - `classic` - minty-web `main`'s profile (`features/profile`, and its
 *   `features/subscription/routes/SubscriptionsOverviewCard.tsx`) - its geometry verbatim, with
 *   Tailwind's radius steps as pixels (`rounded-md` 6px, `-lg` 8px, `-xl` 12px); its colours the
 *   Part 13 roles from `colors.css` (v0.23, owner 2026-11-18), so its buttons are Minty Action,
 *   never Brand #54D3DA.
 *
 * Both looks drop the PASSWORD row (the owner, 2026-10-20), so the loading card is 140px in both.
 */

import type { Look } from "../sidebar/looks";

export const PROFILE_LOOK = {
  v2: {
    // the ×: Material Symbols Rounded, which every development branch loads (Part 13 D-20)
    closeGlyph: "font",
    panel: "flex min-h-full flex-1 flex-col bg-surface-page",
    titlebar:
      "sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between bg-surface-page px-4 py-1.5",
    titlebarButton:
      "flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-state-hover",
    titlebarTitle:
      "p-2.5 text-center text-base font-semibold whitespace-nowrap text-text-secondary",
    titlebarClose:
      "flex size-11 cursor-pointer items-center justify-center rounded-lg text-text-secondary hover:bg-state-hover",
    heroCompany: "relative mt-5 flex flex-col items-center",
    heroCompanyName: "text-sm leading-5 text-text-secondary",
    heroPlan: "mt-2.5 text-label leading-3",
    planSuperMinty: "font-bold text-action-primary",
    planPayment: "text-text-primary",
    planPetty: "text-text-primary",
    avatarScoped: "mt-6",
    avatarUnscoped: "mt-10",
    avatar:
      "flex h-[75px] w-[74px] items-center justify-center rounded-full bg-accent-avatar-bg text-display-l font-medium text-accent-avatar-ink",
    heroName: "mt-4 text-display-l font-bold text-text-primary",
    role: "mt-2 inline-flex h-6 items-center rounded-full bg-status-neutral-bg px-2.5 text-label font-semibold text-status-neutral-ink",
    logOut:
      "mx-auto mt-18 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-body-m font-semibold text-text-link hover:bg-state-hover",
    loading: "mt-10 flex flex-col items-center gap-4",
    loadingAvatar: "h-[75px] w-[74px] animate-pulse rounded-full bg-status-neutral-bg",
    loadingName: "h-8 w-56 animate-pulse rounded-md bg-status-neutral-bg",
    loadingCard:
      "mt-6 h-[140px] w-full animate-pulse rounded-lg border border-border-default bg-surface-sunk",
    error: "mt-10 flex flex-col items-center gap-3 text-center",
    errorText: "text-sm text-text-secondary",
    action:
      "h-11 cursor-pointer rounded-lg bg-action-primary px-4 text-body-m font-semibold text-action-on-primary hover:bg-action-primary-hover active:bg-action-primary-pressed",
    /* DetailsCard */
    card: "mt-8 rounded-lg border border-border-default bg-surface-card px-4 pb-4 pt-2 sm:px-5 sm:pb-5",
    editRow: "-mr-2 flex justify-end sm:-mr-3",
    editButton:
      "min-h-11 cursor-pointer rounded-lg px-2 text-body-s font-semibold text-text-link hover:bg-state-hover hover:underline disabled:cursor-default",
    label: "text-body-s text-text-secondary",
    value: "text-body-m text-text-primary",
    field:
      "mt-0.5 h-11 w-full rounded-lg border border-border-input bg-surface-card px-3 text-body-m text-text-primary focus:border-border-selected focus:outline-none focus:ring-1 focus:ring-border-selected/25",
    // invalid: the 2px danger ring ui/Field.tsx draws (owner, 2026-10-26: both looks turn red)
    fieldInvalid:
      "border-2! border-action-danger! focus:border-action-danger! focus:ring-action-danger/25!",
    tile: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-state-selected",
    row: "flex items-center gap-4",
    emailHint: "mt-1 text-label text-status-danger-ink",
    saveError: "w-full text-body-s text-status-danger-ink",
    save: "h-11 cursor-pointer rounded-lg bg-action-primary px-4 text-body-m font-semibold text-action-on-primary hover:bg-action-primary-hover active:bg-action-primary-pressed disabled:cursor-default disabled:bg-action-disabled disabled:text-text-disabled",
    /* SubscriptionsOverviewCard */
    overview: "mt-7 flex flex-col",
    overviewTitle: "pl-2 text-label leading-5 font-bold text-text-secondary",
    overviewBox:
      "mt-2.5 flex min-h-[165px] flex-col items-center justify-center rounded-lg border border-border-default bg-surface-card p-4",
    overviewLoading: "h-[120px] w-full animate-pulse rounded-md bg-surface-sunk",
    overviewErrorText: "text-label text-text-secondary",
    overviewRetry:
      "h-11 cursor-pointer rounded-lg bg-action-primary px-4 text-body-m font-semibold text-action-on-primary hover:bg-action-primary-hover active:bg-action-primary-pressed",
    overviewEmpty: "text-center text-label leading-5 text-text-secondary",
    figures: "flex justify-center gap-10",
    figureLabel: "text-label leading-5 text-text-secondary",
    figureValue: "mt-2.5 text-title-l font-bold",
    figureUnit: "text-label leading-5 text-text-secondary",
    activeTone: "text-text-secondary",
    trialTone: "text-status-warning-ink",
    manage:
      "mt-5 flex h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-action-primary px-4 text-body-m font-semibold text-action-on-primary hover:bg-action-primary-hover active:bg-action-primary-pressed",
  },
  classic: {
    // the ×: an inline SVG of the same glyph - the main branches load different icon fonts
    // (minty-web and the payments app the Outlined set, Petty Cash the Rounded), so no font
    closeGlyph: "svg",
    panel: "flex min-h-full flex-1 flex-col bg-surface-sunk",
    titlebar:
      "sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between bg-surface-sunk px-4 py-1.5",
    titlebarButton:
      "flex size-10 cursor-pointer items-center justify-center rounded-[6px] hover:bg-state-hover",
    titlebarTitle:
      "p-2.5 text-center text-base font-semibold whitespace-nowrap text-text-secondary",
    titlebarClose:
      "flex size-10 cursor-pointer items-center justify-center rounded-[6px] text-text-secondary hover:bg-state-hover",
    heroCompany: "relative mt-[21px] flex flex-col items-center",
    heroCompanyName: "text-sm leading-5 text-text-muted",
    heroPlan: "mt-2.5 text-[10px] leading-3",
    planSuperMinty: "font-bold text-action-primary",
    planPayment: "text-module-payment-ink",
    planPetty: "text-module-pettycash-ink",
    avatarScoped: "mt-[23px]",
    avatarUnscoped: "mt-[42px]",
    avatar:
      "flex h-[75px] w-[74px] items-center justify-center rounded-[91px] bg-accent-avatar-bg text-[30px] font-medium text-accent-avatar-ink",
    heroName: "mt-[15px] text-[30px] leading-9 font-bold text-text-primary",
    role: "mt-[9px] rounded-[25px] bg-status-neutral-bg px-[15px] text-[10px] leading-5 text-status-neutral-ink",
    logOut:
      "mx-auto mt-[74px] flex cursor-pointer items-center gap-[10px] rounded-[6px] px-3 py-1 text-xs leading-[21px] text-text-secondary hover:bg-state-hover",
    loading: "mt-[42px] flex flex-col items-center gap-4",
    loadingAvatar: "h-[75px] w-[74px] animate-pulse rounded-full bg-surface-sunk",
    loadingName: "h-8 w-56 animate-pulse rounded-[8px] bg-surface-sunk",
    loadingCard: "mt-6 h-[140px] w-full animate-pulse rounded-[12px] bg-surface-card",
    error: "mt-[42px] flex flex-col items-center gap-3 text-center",
    errorText: "text-sm text-text-secondary",
    action:
      "cursor-pointer rounded-[12px] bg-action-primary px-5 py-2 text-sm font-semibold text-action-on-primary hover:bg-action-primary-hover active:bg-action-primary-pressed",
    card: "relative mt-8 rounded-[12px] bg-surface-card px-[19px] pb-[15px] pt-[35px]",
    // The original's Edit sits in the card's corner (absolute), with no row of its own.
    editRow: "contents",
    editButton:
      "absolute right-3 top-1 cursor-pointer text-[10px] leading-5 text-text-link hover:underline disabled:cursor-default",
    label: "text-[10px] leading-5 text-text-secondary",
    value: "text-sm leading-5 text-text-muted",
    field:
      "mt-0.5 w-full rounded-[6px] border border-border-input bg-surface-card px-2 py-1 text-sm leading-5 text-text-primary focus:border-border-selected focus:outline-none focus:ring-1 focus:ring-border-selected/25",
    // An invalid email (v0.11): the danger border, as v2's. Important,
    // so it beats the field's own grey and teal border colours whatever the stylesheet order.
    fieldInvalid: "border-action-danger! focus:border-action-danger! focus:ring-action-danger/25!",
    tile: "flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-state-selected",
    row: "flex items-center gap-[18px]",
    emailHint: "mt-1 text-[12px] text-status-danger-ink",
    saveError: "w-full text-xs text-status-danger-ink",
    save: "cursor-pointer rounded-[12px] bg-action-primary px-6 py-2 text-sm font-semibold text-action-on-primary hover:bg-action-primary-hover active:bg-action-primary-pressed disabled:cursor-default disabled:opacity-60",
    overview: "mt-[27px] flex flex-col",
    overviewTitle: "pl-[9px] text-[10px] leading-5 font-bold text-text-secondary",
    overviewBox:
      "mt-2.5 flex min-h-[165px] flex-col items-center justify-center rounded-[12px] bg-surface-card px-4 py-[18px]",
    overviewLoading: "h-[120px] w-full animate-pulse rounded-[8px] bg-surface-sunk",
    overviewErrorText: "text-xs text-text-secondary",
    overviewRetry:
      "cursor-pointer rounded-[12px] bg-action-primary px-5 py-1.5 text-sm font-semibold text-action-on-primary hover:bg-action-primary-hover active:bg-action-primary-pressed",
    overviewEmpty: "text-center text-[10px] leading-5 text-text-secondary",
    figures: "flex justify-center gap-[39px]",
    figureLabel: "text-[10px] leading-5 text-text-secondary",
    figureValue: "mt-2.5 text-xl leading-5 font-bold",
    figureUnit: "text-[10px] leading-5 text-text-muted",
    activeTone: "text-text-secondary",
    trialTone: "text-status-warning-ink",
    manage:
      "mt-[19px] flex h-[38px] w-[242px] items-center justify-center rounded-[12px] bg-action-primary text-sm leading-[21px] font-semibold text-action-on-primary hover:bg-action-primary-hover active:bg-action-primary-pressed",
  },
} as const satisfies Record<Look, Record<string, string>>;

export type ProfileLookClasses = (typeof PROFILE_LOOK)[Look];
