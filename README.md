# minty-shared-ts (`@minty/shared`)

Minty's shared TypeScript for the **Next.js** apps: the design tokens, the sidebar, the Part 14
primitives (`@minty/shared/ui`, since v0.3) and the modules every app used to carry a copy of. Part 3 step 4 of
`Minty/docs/modernisation/modernisation_plan.md`, brought forward on 2026-10-12.

Flask is not a consumer and never will be - its templates keep their own sidebar and CSS, and
retire in Part 3. `minty-www` cannot consume this either (Tailwind v3, React 18, Next 14); it
carries the same font stacks in its own `tailwind.config.ts`, so **change the two together**.

| Consumer                    | `theme.css` | the modules                                                 |
| --------------------------- | ----------- | ----------------------------------------------------------- |
| `minty-web`                 | yes         | yes                                                         |
| `minty-payment-request-web` | yes         | yes                                                         |
| `minty-onboarding-web`      | yes         | yes (sidebar and profile on `development` since 2026-11-03) |
| `minty-petty-cash-web`      | yes         | yes, and the first consumer of `ui`                         |

## The shared modules and presets (v0.7)

Every app's `development` takes these instead of its own copy (the shared-code refactor, owner
2026-10-21). Each `main` keeps its own code until `development` is promoted. Behaviour is one rule
per concern; each module's header comment and tests are the specification.

| Subpath         | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./money`       | `formatMoney` ("HKD 1,234.50" - the code, a non-breaking `CODE_SPACE`, the currency's places), `formatPrice` (prices on the onboarding and subscription screens: a trailing ".00" dropped), `formatAmount`, `parseAmount` (null, never a silent 0), `acceptAmountInput`, `formatAmountTyping` / `formatCountTyping` (commas as you type, caret kept; v0.9)                                                                                                                                                                                                                                                                                                                                                                                                           |
| `./dates`       | `HK_TIME_ZONE`, `isoDateInTimeZone(tz, d)`, `todayIso`, `daysFromToday`, `MONTHS`, `formatDay` ("05 Sep 2026", "" for a non-date), `formatInstantDay`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `./apiClient`   | `ApiError`, `withQuery`, `readBody`, `errorSentence`, `HOUSE_FALLBACK`, `SESSION_ENDED`, `createBearerClient` (each app's 401 rule is its `onUnauthorized` callback)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `./errorCopy`   | `friendlyError`, `errorCopy`, `readsAsProse`, `resolveApiErrorMessage`, `statusFallback` - machine text never reaches a person                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `./auth`        | `createCookieAuth({ prefix, maxAge? })`, `decodeJwtPayload`, `secondsUntilExpiry`, `isTokenExpired`, `isTokenExpiringSoon`, `moduleClaims`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `./handoff`     | `createHandoff`, `hubHandoffUrl`, `flaskHandoffUrl`, `mintyEntryUrl`, `logoutUrl`, `redeemHandoffCode` (no React)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `./landing`     | `useLandingHandoff`, `readLanding` ("use client" - the `/landing` page)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `./portal`      | `createProfileApi`, `fetchAllSubscriptions`, `loadViewer`, the Portal types                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `./amountInput` | `useAmountInput({ value, onValue, kind, decimals })` - spread on a controlled `<input>`: commas as the person types, the caret kept on its digit, places padded on blur; `kind: "count"` for whole numbers (v0.9, owner 2026-10-26)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `./clientValue` | `useClientValue`, `useMounted`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `./env`         | `envUrl(name, raw, devFallback)` - throws in a production build when the variable is unset                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `./download`    | `saveBlob(blob, filename)`, `saveTextFile`, `filenameFromDisposition`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `./proxy`       | `toFlask` - the hand-over to Flask, a meta-refresh page on preview-set hosts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `./backLink`    | `goBack(fallback, { skip, leaveApp })`, `BackLink`, `stepsBack`, `isSkipped` - "Back" to the page the person came from: past the caller's `skip` pathnames and the one-time hand-off pages; out to another app only with `leaveApp`; else the fallback (v0.20, moved from minty-web)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `./companyRef`  | also `companyPath`, `companyRefFromPath`, `addressCompanyRef` and the cross-app settings URLs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `./filePreview` | (v0.37, the user 2026-11-24, moved from minty-payment-request-web) the one file preview: `PreviewBlock` (image, PDF, sandboxed HTML, or "Preview is not available"), the inline `FilePreviewPane` ("Document preview • 1.2 MB" + View full), `AttachmentFullScreenViewer` (dark, pinch zoom, capture-phase Escape, never a tab or a download), `usePinchZoom`, `resolvePreviewMime`, `fileIconInfo`, `formatFileSize`. The app first calls `registerFilePreviewHost({ iconClass, fetchBlob })` (its icon font class; its authenticated fetch of an API path to a `blob:` URL) - each app does it in its own `lib/filePreview.ts` and imports the preview from there. Needs `pdfjs-dist` (an optional peer) and `copyPdfjsAssets()` from `./next` in `next.config.ts` |
| `./pdfPreview`  | (v0.37) `PdfJsCanvasPreview` - every page of a PDF drawn with pdf.js from the app's `/pdfjs` (password prompt, damaged-file sentences). Its own subpath so an app's tests can stub it (`vi.mock("@minty/shared/pdfPreview")`; jsdom has no canvas)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `./heic`        | (v0.36, the user 2026-11-24) iPhone HEIC photos: `isHeic(type, name)`, `canDraw(url)`, `browserDrawsHeic(url)` - drawn as stored where the browser can (Safari 17+), else the app asks its API for `?as=jpeg`, made on the fly; found out from the photo, never the user agent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Config presets (plain `.mjs`/`.json` with `.d.mts` types - Node, Next, Vitest and Playwright will
not strip types from `.ts` under `node_modules`): `./tsconfig.base.json`, `./prettier`, `./eslint`,
`./vitest` (`mintyVitest`), `./playwright` (`mintyPlaywright`, `PHONE`), `./next`
(`withMintyDefaults`, `securityHeaders`, `copyPdfjsAssets` - v0.37), `./e2e` (the hand-off token, credentials, `reachable`,
`expectNoSideScroll`, and `companyRef` as JS - `config/companyRef.mjs`, tested equal to the `.ts`).

## Installing

```
npm install "git+https://github.com/minty-live/minty-shared-ts.git#v0.2"
```

npm will normalise that to `github:minty-live/minty-shared-ts#v0.2` in `package.json`
and to a `git+ssh://` URL in `package-lock.json` whatever you type. **That is expected and it
works**, because this repo is public: npm falls back to HTTPS, so `npm install` and `npm ci` both
succeed with no SSH key anywhere (verified 2026-10-12 with ssh forced to fail). Making this repo
private would break every consumer's CI and Vercel build until a deploy key existed.

**Tags are immutable.** A tag is cut from `main` and never moved - unlike the `.github` repo's
`v1`, which moves by design. npm caches git dependencies, so a moved tag hands two machines
different code under one pin. No `#main` or `#development` pins anywhere.

## What a consumer must add

Two things for the tokens, two more for the components.

```css
/* app/globals.css */
@import "tailwindcss";
@import "@minty/shared/theme.css"; /* the tokens - plain CSS, fails loudly if wrong */
@import "anything/else.css"; /* every other @import comes next */
@source "../node_modules/@minty/shared/src"; /* ONLY if you render the components - see below */
```

**`@source` goes after every `@import`.** CSS requires imports to precede other rules, so an
`@source` above one silently invalidates it: placed above minty-payment-request-web's checkbox
import, it would have dropped those styles with no error anywhere.

```ts
// next.config.ts
transpilePackages: ["@minty/shared"],       // this package ships .ts source, not a build

// vitest.config.ts - Vitest does not read transpilePackages
server: { deps: { inline: ["@minty/shared"] } },
```

### The `@source` line is not optional, and nothing tells you when it is missing

Tailwind v4 **never scans `node_modules`**. Without `@source`, every utility class inside a
packaged component is dropped from the generated CSS - the sidebar renders as unstyled stacked
text, with no error anywhere. (This already drove `minty-onboarding-web/components/ModalFrame.tsx`
to hand-written CSS before the package existed.) The path is relative to the stylesheet, not the
package name: Tailwind resolves it as a path, and a bare `@minty/shared` would match nothing -
silently.

`theme.css` is different: a plain `@import` resolved by the bundler, exactly like
`material-symbols/outlined.css`. Misspell it and the build fails.

### `tokens.css` - the Part 13 design tokens (the sidebar needs them)

```css
@import "@minty/shared/theme.css";
@import "@minty/shared/tokens.css"; /* colour, radius, type, elevation - Part 13 v1.1 */
```

The Minty v2 tokens from `Minty/docs/design/part-13-visual-design-system.md`: `--minty-*`
primitives in `:root`, and the semantic roles (`--color-action-primary`, `--color-text-secondary`,
`--color-status-info-bg` ...), the radius scale (`rounded-lg` = 12px), the type styles
(`text-body-m`, `text-label` ...) and two shadows in `@theme`, so they generate utilities. Screens
bind to the semantic roles only, never a hex. **The sidebar's classes use them**, so a consumer
that renders it must import this file - without it the menu draws in Tailwind's defaults. Dark
values exist under `:root[data-theme="dark"]` and nothing sets that attribute yet (Light at
launch, D-24). Note it redefines Tailwind's `--radius-sm/md/lg/xl`: that is the Part 13 scale.

### `colors.css` - the colours alone (v0.23)

```css
@import "@minty/shared/colors.css"; /* the Part 13 colours only - no radius, type or shadow */
```

**One palette for every app: minty-web `main`'s colours (owner, 2026-11-18), not Part 13/14.**
The `--minty-main-*` primitives hold main's most-used colour for each job - primary #4FC7C7, focus
#54D3DA, links #2E9B9B, text #16202E/#6B7380/#8B93A0, lines #EEF1F4/#D8DEE4, danger
#DC5A5A/#B42318 - and a checked tick box is #3CBCC3 (`action-tick`). The owner tunes it page by
page (Figma 566:909). `colors.css` holds the primitives, the `--color-*` roles and their Dark
values - and nothing else, so an app that keeps Tailwind's
own `rounded-*`/`text-*` steps (minty-web, minty-payment-request-web) takes every colour from here
without its shapes moving. `tokens.css` imports it: load one or the other. **Every consumer must
load one of the two from v0.23** - the classic looks draw in these roles. A checked tick box is
Minty Action #3CBCC3 with a white mark. v0.29 (the user, 2026-11-23): the Petty Cash name
(`module-pettycash-ink`) is amber #EA9713 (minty-web main's, `--minty-main-warn`), no longer
#8A5606, and the sidebar's Petty Cash heading is set in it in both looks, as Payment Request's is
in its blue.

### The sidebar rail (opt-in)

`<SidebarProvider rail>` keeps the menu on screen as a fixed 280px rail on the right from 1280px
(Part 14 / 15 "One layout", D14-15); below that it stays the sheet the ≡ opens, and the ≡ hides
where the rail shows. The page's outer frame must carry `SIDEBAR_RAIL_OFFSET` (exported from
`@minty/shared/sidebar`) so nothing sits under the rail. Without `rail` nothing changes.

### The sidebar's look (v0.4)

From v0.4 the sidebar draws minty-web's Minty v2 look (the owner's choice, 2026-10-15) in place
of v0.2's compact Part 13 restyle: a 353px sheet, 44px rows in `text-title-l`, the module
headings with their 76px icons on the right, the 99px logo and a 28px header badge. Only the
classes changed - the host, the rail, the scroll lock and every behaviour are v0.3's. The rail
was drawn for the compact look; this geometry has not been checked inside its 280px yet, so
check it before a consumer turns `rail` on.

From v0.5 the sheet casts its `shadow-overlay` only while open. Closed, it waits just past the
right edge, and in v0.4 its shadow fell back onto every page as a faint strip about 20px wide.

### Two designs: `look="classic"` and `look="v2"` (v0.6)

The owner (2026-10-20): the sidebars are shared, in two designs - **`classic`**, minty-web
`main`'s original (v0.1 of this package), on every `main` branch; and **`v2`**, the redesign
above, on every `development` branch. One implementation - behaviour, host, rail and scroll lock
are the same - with two sets of classes (`src/sidebar/looks.ts`, `src/profile/looks.ts`):

```tsx
<SidebarProvider look="classic" profile={…}>   // main branches
<SidebarProvider profile={…}>                    // development: v2 is the default
```

My Profile and its Subscriptions Overview follow the provider's look (or take `look` themselves,
for a page drawn outside a sidebar). `classic` keeps the originals' geometry verbatim (every
class traced back to its source, 86 slots, 2026-10-20), with Tailwind's radius steps as pixels
(`tokens.css` redefines `rounded-md/-lg/-xl`). Its colours are the Part 13 roles from
`colors.css` since v0.23 (one palette, owner 2026-11-18): its buttons are Minty Action, never
Brand #54D3DA. A test keeps hexes, palette colours and the redefined radius steps out of it. Both looks drop the PASSWORD row, and
both keep the two fixes made since v0.1: the panel fills the sheet, and the sheet's shadow only
while open.

Each consumer keeps a test that compiles its real `app/globals.css` through its real
`@tailwindcss/postcss` and asserts the tokens and the packaged declarations are in the output.
That test is the only thing standing between a lost line and a broken page.

### `public/` assets

The menu renders fifteen files under `/menu/`. Next cannot serve a static file out of
`node_modules`, so **they live in each app's `public/`**. `SIDEBAR_ASSETS` (exported from
`@minty/shared/sidebar`) is the list; each consumer asserts its `public/` against it, because a
missing file is a broken image rather than an error.

### The Part 14 primitives (`@minty/shared/ui`)

Button, Field, ErrorSummary, InlineAlert / PageBanner, Modal / Drawer, StatusPill, EmptyState,
FilterChip, SegmentedControl, PageHeader, Skeleton and Icon - built in minty-payment-request-web's
Part 13-15 migration (2026-10-13) and lifted here in v0.3. They draw only with the semantic token
utilities of `tokens.css`, so a consumer needs that sheet and the `@source` line. Two changes
from the app's copies:

- `StatusPill` takes its `tone` as a prop. Which status is which tone is each app's own map (its
  `lib/statusTone.ts`); the five tones and their colours (`TONE_CLASS`) are here.
- `Modal` / `Drawer` hold the page still through `@minty/shared/scrollLock` (reference counted;
  the element with id `app-scroll-root` when the app has one, else the body). An app's sidebar
  host can hand the same lock to `lockScroll`, so a drawer over the menu shares one count.

`UI_ASSETS` lists the `public/` files they render (`/cat-hole.png` for the first-use empty state),
under the same contract as `SIDEBAR_ASSETS`.

minty-payment-request-web still renders its own copies; it moves to these in its own task.

v0.13: `ErrorSummary` takes `look="classic"` for every app's `main`/`development` (v0.23: the same
danger colours as `v2`, with the classic radius); `v2` stays the default.

### The document reader (`@minty/shared/reader`, v0.13)

Reading an attached receipt or invoice with the model and filling the form's empty fields as
suggestions (owner, 2026-11-04) - Petty Cash's Add New Expense and Payment Request's new-bill form.

- `core`: the answer (`suggestionsOf`, `failureOf`), a session latch per reader
  (`createReaderLatch(key)`: a `disabled` answer keeps that reader out of the way for the tab), the
  reading copy (`readingCopy`: a photo shrunk to 2000px for READING only - saving sends the
  original), and the rules around a form's own values (`readerState`, `edited`, `cleared`,
  `usedNote`, `withoutSuggestions`, `fillable`). Never overwrite the person; a field still at its
  untouched default counts as empty (`touched`; `touchOnSame` for a form with defaults).
- `useDocumentReader({ post, field, latch, onSuggestions })`: one read at a time, cancellable, and
  `failed` - the one quiet failure line's switch (a failure reason, a cut connection, or
  `onSuggestions` returning false because nothing was shown).
- The classic-look pieces (v0.23: in the `colors.css` roles): `ReadingNotice`, `SuggestedLine`, `ReaderNote`,
  `ReadFailedLine`, `SUGGESTED_RING`, and (v0.22) `ReadButton`. Each app passes its own words.
  `SuggestedLine` (2026-11-25, the user): the sparkle at the start, the sentence wrapping beside it
  and Clear after its last word, so a phone never puts the sparkle or Clear on a line alone; Clear's
  44px tap area is its `::before` (4px up, so it never covers the field above, 20px down).
- v0.22 (owner, 2026-11-18): a document is read only when the person presses `ReadButton`
  ("Read the receipt", "Read the invoice") - never on attaching it. Each app shows the button once
  a readable file is attached, the API says the reader is switched on, and that file has not been
  read yet (again after a failed read), and calls `useDocumentReader`'s `read(file)` on the press.
- v0.25 (owner, 2026-11-19): `AiCaution` - the owner's sentence (`AI_CAUTION`: "AI suggestions may
  be inaccurate." - one sentence since v0.30, owner 2026-11-23, the same in both apps and for a
  converted amount; in the warning amber `text-status-warning-ink` since v0.32, the user
  2026-11-23), which each form shows under its fields once a read has shown anything, until
  the line is saved; its id goes in the save buttons' `aria-describedby`. Also v0.25 (owner,
  2026-11-19), an amount converted from another currency: `Exchange`, `exchangeOf` /
  `exchangeFailedOf` (the API's `exchange` / `exchange_failed`), `exchangeKept` (the field still
  holds the converted figure), `exchangeFields` (the six details by the saved line's column names),
  `convertedText(exchange, code)` ("converted from USD 12.34 at 1 USD = 7.85 HKD (13 Nov 2026 rate)", plus ", the last business day before 15 Nov 2026" when a weekend or holiday moved the rate's day - the API's `asked_date`; the source stays on the line, not named to the person).
- v0.31 (owner's launch decisions, 2026-11-23, after IRD's "A Guide to Keeping Business
  Records"): a document that is not one record of a payment. `EVIDENCE_REASONS` /
  `evidenceRefusalOf(answer)` (`several_documents` only since v0.38 - `no_description` is gone;
  never `failureOf`'s quiet line), `useDocumentReader`'s `onRefused(reason)`, and its words:
  `severalDocuments(document)` (the pop-up's title and text, v0.38 the user's words: "This file
  seems to contain more than one receipt. Please upload one receipt per entry."; "invoice" for
  Payment Request). `exchangeNote(exchange)` = "(USD 35.00 @7.78)", added after the description
  (plain spaces; the rate as the API gives it).
- v0.38 (the user, 2026-11-25): the outlines after a read. `outlined(state, { empty, check })`
  names the fields the read left empty (`EMPTY_RING`, red - a warning only, never a gate on
  saving) and the suggested fields to look at again (`CHECK_RING`, orange - an inferred
  description and its account, a supplier not on the list); `outlineOf(state, field)` /
  `outlineRing(state, field)` give `empty`, `check`, `suggested` (`SUGGESTED_RING`, teal) or none,
  and `SuggestedLine`'s `tone="check"` writes its line (`PLEASE_CHECK`) in the warning ink. An
  edit takes a field's outline away, Clear its orange, a used note its red, and another document
  all of them. `ReaderState.empties`/`checks` are optional, so an older L1 draft still reads.
- v0.34 (owner, 2026-11-24): `rateText(exchange, code)` writes a rate as "1 {stronger} = n
  {weaker}", n always 1 or more, 2 decimals rounded - "1 USD = 7.85 HKD", "1 HKD = 7.43 PHP",
  "1 HKD = 171.51 KRW" - for any company currency. The stored rate (the company currency per 1
  foreign unit, as the API gives it, `exchangeFields`) never changes; only the display flips.
  `exchangeNote(exchange, code)` names both currencies: "(USD 35.00 @ 1 USD = 7.85 HKD)";
  `convertedText` uses `rateText` too, and shows no rate without the company's code.
- v0.35 (the user, 2026-11-24): a wrong or poor document, warned about and never refused.
  `photoQuality(file)` (`./quality`, no AI) - "blurry", "dark" or "small" for a JPEG/PNG, null for
  a PDF or where the browser can't decode it; blur is the 99th percentile of |Laplacian| on a grey
  copy at most 512 px across (`QUALITY_LIMITS`: short edge 600 px, brightness 60, edge strength
  30 - calibrated on drawn receipts; tune on real photos), `qualityOf` the pure maths,
  `photoQualityText(finding, name?)` the line. `documentWarningOf(answer)` /
  `documentWarningText(warning, document)` read the API's `document_warning`
  (`bank_payment_confirmation`, `other`, `unreadable`), and `useDocumentReader`'s
  `onWarning(warning | null)` hands it to the form after every answered read.

Each app keeps its fields and words (minty-petty-cash-web `lib/expenseAi.ts`,
minty-payment-request-web `lib/invoiceReader.ts`). Needs the `@source` line.

### Auto-saved drafts (`@minty/shared/drafts` + `ui`'s `DraftRestore`, v0.28; v0.33 restores at once)

What a person types is kept IN THIS BROWSER 2 seconds after their last change (the owner's
decisions doc L1; the user's choices, 2026-11-20: browser only, 2 s), as a separate
copy - never the real record: only the form's own Save writes that. `useAutoSaveDraft({scope,
form, record, shape, ready, basedOn, value, dirty, files})` keeps it (JSON in localStorage, files
in IndexedDB `minty-drafts`, written when picked; a pending save is flushed on `pagehide` and when
the tab is hidden - never `beforeunload`) and returns `offer`, `restore`, `discard` and `clear`.
`DraftRestore` puts the draft back the moment the form has one - no question, nothing drawn (the
user, 2026-11-24; v0.28-v0.32's `DraftNotice` asked "You have unsaved changes from 10:42." -
Restore or Discard). `basedOn` is the record's version when the draft was taken (an
`edit_version`, an `updated_at`, or `fingerprint(loaded values)`): a record saved again since
makes the offer `stale` (or the form passes `"locked"`: no longer changeable), and `DraftRestore`
drops it silently - never put back over someone's save.

- Kept per person and company: `minty:draft:1:{user}:{entity|-}:{form}:{record}`
  (`draftScopeFromToken`: the token's `user_id`, `entity_id`); the person is checked again on
  read, so a shared computer never shows one person's draft to another. `shape` is the form's own
  version of its value: a mismatch drops the draft.
- Removed by the form's `clear` after its own Save, when stale, after 7 days (`sweepDrafts`, once
  a page load), and on an explicit sign-out (`clearDraftsForUser`, within 500 ms) - NOT on the
  60-minute session expiry, which it exists to survive. A sign-out in one app cannot reach
  another app's storage (another origin): those drafts are that same person's only and go after
  7 days.
- Limits: 256 KB of JSON; files 10 MB each, 25 MB a draft (more is named in `missing` and
  simply not restored - the user, 2026-11-24: no message). A storage failure (quota, private mode, IndexedDB
  blocked) never breaks the form and never toasts: `console.error("Draft not kept", ...)` once.
- Never kept: card details (Stripe's fields) and passwords.
- The Talk to Minty chat keeps its message this way (form `contact.message`, per person).

### "Your session has expired" (`@minty/shared/sessionExpired` + `ui`, v0.26-v0.27)

One pop-up for every app (owner, 2026-11-19): a Minty sign-in ends after 60 minutes without
activity, or on sign-out, and every API then answers its 401 with `reason: "session_expired"`
(minty-shared-py `tokens.unauthorized_reason`). `isSessionExpired(body)` reads that;
`showSessionExpired(loginUrl)` raises the pop-up once (later calls change nothing) and
`SessionExpiredHost`, drawn once in each app's `app/layout.tsx`, shows it - OK, Escape and the
backdrop go to `loginUrl`. `SessionExpiredDialog({ open, onOk })` is the same pop-up driven by its
props (minty-web's sign-in page opens it on `?expired=1`; OK only closes it). It is drawn as
minty-web's question modal (`ConfirmDialog`'s one-button case): the title beside the clock cat,
the sentence (`SESSION_EXPIRED_TITLE` / `SESSION_EXPIRED_TEXT`), one centred teal OK (full width on
a phone); focus, the focus trap and the scroll lock are `Overlay`'s `useOverlayBehaviour`. The cat
is `/session/minty-clock.webp`, which each app serves and asserts (`SESSION_EXPIRED_ASSETS`, like
`CONTACT_ASSETS`). v0.27 gave the card `ConfirmDialog`'s own shadow: minty-web and Payment Request
web load `colors.css` without `tokens.css`, where `shadow-modal` lives. A 401 without the reason is
only the app's 30-minute token running out - renewed quietly, no pop-up. Each app's
`lib/sessionExpired.ts` is its seam over this store (its callers and tests use it). Needs the
`@source` line.

### The Minty cat and "Talk to Minty" (`@minty/shared/contact`, v0.14)

The cat at the bottom right of every app (owner, 2026-11-05). A click opens a pop-up on the cat
("Hi! How can I help?") listing the page's `actions` - minty-web's entity list puts "Create
company" there instead of its old floating + - and "Talk to Minty", which opens a scripted chat.
It opens on the main topics as rows under Minty's greeting (`MAIN_TOPICS`: Contact Support,
the only one until the bot); picking one opens a new chat in it. Contact Support asks one thing at
a time - name, email, company (the viewer's name and email, and the company it is in, are one-tap
answers when the app knows them - `Viewer.email` is optional; an app that has none passes
`loadEmail`, asked once a page and only when Contact Support opens),
the topic (`TOPICS`, rows in the chat) and the message - each checked as it is typed, the email
with Flask's rule (English only, an address and no markup). Then a review of every answer, each
with its own Edit, and Send. The header's back arrow goes back to the main topics (the answers kept), "Ask
something else" starts over after a send. No AI: `script.ts` is a reducer, so a chat bot can
replace it later without touching the window.

```tsx
<ContactLauncher send={(m) => postToFlask("/api/me/contact", m)} notify={toast.show} />
```

- `send` posts `{name, email, company, topic, message, app, entity?}` to Flask's `POST /api/me/contact` (bearer;
  minty-onboarding-web through minty-onboarding-api's `/api/onboarding/me/contact`) and resolves
  with `{reply_to}`; a refusal throws an `Error` whose `message` is the sentence to show. The app
  id and company id come from the sidebar host; Flask also names the signed-in account.
- A page adds its own lines while it is mounted: `useContactActions([{ id, label, icon: "add",
href }])` (a link) or `onSelect` (a callback); pass a stable array.
- Mount it inside `SidebarProvider` (its look; the rail offset from 1280px) and the app's toast.
  It draws nothing until the viewer is known, so the sign-in pages show no cat; `hidden` hides it
  on a public page.
- The classic look draws in the `colors.css` roles (v0.23) with its own shadows; its icons
  are inline SVG, because the apps load different Material Symbols faces, or none.
- The cat is the owner's own waving clip (an animated WebP, the still frame first and under
  reduced motion); it squishes on a tap and hops when a message is sent; the pop-up and window rise out of it, lines pop in, rows lift and press in.
  Nothing moves under reduced motion. `CONTACT_ASSETS` (`/contact/minty-cat.webp`,
  `/contact/minty-cat-animated.webp`, `/contact/minty-support.webp` and, since v0.18,
  `/contact/minty-tab.webp` and `/contact/minty-tab-right.webp`) is a `public/` contract like `SIDEBAR_ASSETS`.

v0.15 (owner, 2026-11-09): the cat stood on a page's last controls - minty-payment-request-web's
pager, Page 3 and Next, could not be clicked from 1280px.

- **Room for itself:** on a page that scrolls (content taller than the screen), the cat on its
  resting spot adds an empty block its own height (plus the gap under it) at the end, so whatever
  ends in the bottom-right corner scrolls up clear of it. A page that fits the screen - one that
  scrolls inside itself, like minty-web's company list - gets none. The block goes in the app's
  scroller: `#app-scroll-root` when the app scrolls that wrapper (`scrollLock`'s rule), else `body`.
- **Tuck away:** the pop-up's close (x, "Tuck Minty away", a 44px target; Escape still only
  closes the pop-up) leaves only a 44 x 56px tab on the screen's edge ("Bring Minty back"), beside
  the rail when there is one. Remembered per browser and per app in `localStorage`
  (`minty-cat-tucked`: "1" tucked, "0" brought out); if storage refuses, it still tucks for that
  page. **Tucked is the default (v0.18, owner 2026-11-11):** a browser that has never brought the
  cat out, or cannot read storage, shows the tab. Tapping the tab brings the cat back with its
  pop-up open. Focus follows to the tab, and back to the pop-up's first line. The tab peeks with its own picture, the
  thinking cat (`CAT_TAB`, `/contact/minty-tab.webp`, owner 2026-11-11), not the cat's still,
  drawn whole at 40px; on the right edge it is mirrored with the "?" kept upright (`CAT_TAB_RIGHT`,
  `/contact/minty-tab-right.webp`), so the "?" always faces the page.
- **Dragged anywhere:** the cat can be dragged and stays exactly where it is let go - no snapping
  (`minty-cat-place`, its distance from the right and bottom edges, kept on screen when the window
  shrinks). A press that moves less than 6px is still a tap. On the left half its pop-up, chat
  and tab open on the left. Moved off its resting spot, it leaves no room at the page's end.

### My Profile (`@minty/shared/profile`, v0.6)

The sidebar's second view: My Profile opens over the page, never as a page of its own (the
owner, 2026-10-20). It was a copy per app (minty-web's `features/profile` the original); since
v0.6 it is one `ProfilePanel`, drawn in the shared tokens - the same values minty-web's app
tokens held, so the look did not move. No PASSWORD row: Minty holds no password (the owner,
2026-10-20).

v0.10: the email's shape is checked. Besides blank ("We'll need an email here.") and non-English,
an email that is not an address (`isEmail`) is refused before anything is sent - "That email
address doesn't look right." - shown under the field once it has been left or Save tried, and
gone as soon as a valid one is typed. The names stay optional.

v0.11: an invalid email gets a red border in both looks (classic #b42318, v2 the Part 13 danger ring).

v0.12: My Profile opens ONLY in the sidebar - no app has a profile page (the owner, 2026-11-03;
minty-web's `/profile` is a 404). With no slot to open it in, the menu's name is plain text and
the header's initials link to the host's `links.entities()`, named "Select Company" for where they
go. `links.profile` is unused and optional (`@deprecated`): drop it from the host when bumping.

```tsx
<SidebarProvider profile={<ProfilePanel api={profileApi} notify={toast} />}>
```

- `api` - the app's two Flask calls, `load(entityId, signal)` and `save(changes, entityId)` over
  its own bearer fetch (`GET` / `PATCH /api/me/profile`). A refusal rejects with
  `{ status, message }` and the message is shown as it stands; a 401 shows nothing (the app is
  already re-signing in); anything else gets the panel's own words. Keep it module-level: a new
  object per render reads the profile again.
- `notify(message, kind)` - the app's toast.
- `subscriptions` - optional; normally the packaged `SubscriptionsOverviewCard`.
- From the host it takes `entityId()` (the company named) and `logOut()`.

`SubscriptionsOverviewCard load={…}` is the profile's "Subscriptions Overview" (10-A/10-B):
"Active subscriptions" and "Trial ending" counted as minty-web's portal counts them
(`overviewFigures`, its `overview` and `calendarDays` lifted - change them together), and Manage
Subscription to the host's `links.subscriptions()`. `load(signal)` is the app's read of
subscription-api's `GET /api/me/subscriptions`, every page, resolving `{ entities }`; same refusal
rules as `api`.

`PROFILE_ASSETS` lists its five `public/profile/` files, under the same contract as
`SIDEBAR_ASSETS`. minty-web and minty-payment-request-web still render their own copies (with
the PASSWORD row) until they bump past v0.5 - a change to the panel touches all of them until then.

## The host

Everything that differs per app comes through one object, which the app registers:

```ts
// components/ui/sidebarHost.ts  - the ONE app-specific file
import { setSidebarHost, type SidebarHost } from "@minty/shared/sidebar";

export const sidebarHost: SidebarHost = {/* ... */};
setSidebarHost(sidebarHost);
```

It answers: the company in the cookie and its name, which modules it has, where each menu item
leads **from this app**, which path means which menu item, how the page's scroll is held, what
Logout owes (including any "Leave without saving?"), the current token, and who is looking. See
`src/host.ts` - it is the shape of `minty-payment-request-web`'s own `sidebarHost.ts`, which was
written as the design for it.

Three of its fields exist for reasons that each cost a debugging session to find:

- **`app`** (`"minty-web"`, `"minty-payment-request-web"`). The "one page, one app" guard keys on
  this name and NOT on object identity: Next evaluates a host module once per bundler layer and
  again on **every HMR edit**, so one file legitimately produces several distinct objects in a
  single page. Identity threw "a second, different sidebar host" on an ordinary dev reload.
  Re-registering the same app replaces the host, which is what HMR needs - the old object closes
  over the modules it was built from.
- **`usePathname()`** - the app's router, as a hook. This package imports no `next/navigation` at
  all, because `vi.mock("next/navigation")` in a consumer's test **does not reach a module inside
  `node_modules`**: a packaged component read the real hook, got `null` outside an app-router tree,
  and the sidebar stopped closing on a move between pages. Asking the app means the app's own mock
  applies. (`SideMenu` still reads `window.location.pathname` - it is drawn in the drawer's portal
  and re-rendered whenever it opens, and a screen test renders it with no router at all.)
- **`loadViewer()`** rather than a fetcher, because the two apps' clients disagree about what a 401
  means (`"handoff"` vs `"reauth"`) and a shared fetch type would have to widen one of them. Since
  v0.19 the viewer also carries **`can_view_subscriptions`** (accounts-api's
  `user.can_view_subscriptions`). The menu draws **Manage subscriptions** only when it is `true`,
  which covers admins, accountants and subscribers (owner, 2026-11-12). A host that drops it hides
  the item from everyone, so every host's `loadViewer` must pass it. When a page hands in its own
  viewer without the flag, the menu falls back to the profile read. My Profile's overview counts
  only the rows the person may change (`can_manage !== false`, `ownEntities`).

A module-level registry, not a React provider, for two reasons that are not style: every app's
`app/layout.tsx` is a **server** component, so functions cannot be passed across that boundary as
props; and `src/lib/viewer.ts` is a module-level store whose reads happen outside any React tree.
An unregistered host **throws**, naming the file to write - there is no silent default.

Each consumer keeps thin shims at the old paths (`components/ui/Sidebar.tsx` and friends) whose
first line imports its `sidebarHost` for the side effect. That is what guarantees the host is
registered before anything renders, and it means no page, feature or test had to change.

**One trap that lands in the consumer's tests:** a `test/setup.ts` importing a shim at the TOP of
the file pulls the host, and with it `next/navigation`, into memory before any test file's
`vi.mock` is registered - binding the real modules for good. Import it inside the hook instead.
Both consumers do.

## No tokens in addresses (`./handoff`, `./landing`, v0.16-v0.17)

Gap 4 of the sign-in hardening (owner, 2026-11-09). accounts-api no longer hands an app its token
in the address: it sends `/landing?code=<one-time code>&next=…&entity_id=…&entity_name=…`, and the
landing swaps the code for the token in the browser - `useLandingHandoff({..., accountsApiUrl})`
calls `redeemHandoffCode`, a `POST <accounts-api>/api/handoff/redeem` with no cookie. A code is
good once, for 2 minutes, and only from the app it was handed to. The hook returns
`{ refused }`: the sentence to show when a code cannot be swapped (`HANDOFF_CODE_REFUSED` unless
accounts-api sent its own); the page offers a "Continue" that runs its `onNoToken`, never an
automatic redirect (which could loop). One swap per code per page, so Strict Mode's second effect
run does not spend it twice. Since v0.17 a `?token=` in the address is never stored: it goes the
app's way back like an address with nothing.

The way back, `mintyEntryUrl`, carries **no token**: `/entity/<id>/enter?next=` works on the
person's accounts-api session, or signs them in and returns (the old `token` argument is gone).

## Preview sets (`@minty/shared/previewSibling`)

A branch's previews are one set of hosts, `pr-<slug>-<app>.dailyminty.com`, which the `.github`
repo's `vercel-preview-set.yml` keeps complete (the branch's build where a repo has the branch,
the fallback build where it does not). The apps are `my`, `payment-request`, `onboarding`,
`pettycash` (`petty-cash` until 0.5, renamed with its hosts `pettycash.` / `dev-pettycash.`) and
`www`. `siblingUrl(configuredUrl, app, currentHost)` moves a
sibling app's URL into the set the page is served from, and returns it untouched on every other
host. Pass the host the page is actually on - `window.location.host` in the browser, `headers()`
in a server component, `request.nextUrl.host` in middleware - never a build-time value, because
the fallback build is a production build that must still stay inside the set. No React or Next
imports, so it is safe in edge middleware.

`withReturnOrigin(url, origin?)` adds `return_origin` to an address on Minty (Flask), so Flask
can hand back into the set; every trip an app makes to Flask goes through it.

## Working on it

```
npm install      # once
npm run typecheck
npm run lint
npm test
```

No `@/` alias here, deliberately: `tsconfig.paths` does not apply inside `node_modules`, so an
aliased import would resolve in this repo and fail in a consumer's build. Imports are relative,
and anything app-specific is asked of the host. `eslint` fails on `@/` for that reason.

No root export either - `exports` lists one subpath per module. `minty-payment-request-web`'s edge
`middleware.ts` imports `companyRef`, and a barrel would drag `react` and `next/navigation` into
the middleware bundle.

Tests for the lifted modules live here now and were deleted from the apps - one implementation,
one suite. Each app keeps its own `Sidebar.test.tsx`, which tests **its** wiring; those two
diverged 313 lines on purpose and are not reconciled.

### Releasing

`development` -> green -> `main` -> `git tag -a vX.Y` on `main` -> push the tag. Then each
consumer bumps its pin on a branch, so that app's own CI and a Vercel **preview** build prove the
new tag before `development` moves. Never push a pin bump straight to `development`: production
builds from it.
