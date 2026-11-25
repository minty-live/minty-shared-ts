// Every Minty Next.js app's next.config defaults. An app's next.config.ts:
//
//   import { withMintyDefaults } from "@minty/shared/next";
//   export default withMintyDefaults({ env: { ... }, ...its own });
//
// Plain .mjs: Next loads its config before it can transpile anything under node_modules.

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

/**
 * Sent with every response (the URL security round, 2026-10-05). Keep in step with Flask
 * (Minty pettycash/core/http_hardening.py).
 * - Referrer-Policy same-origin: another site never sees a path or query from here (tokens).
 * - frame-ancestors / X-Frame-Options: only this app may frame its pages (clickjacking).
 * - HSTS in production builds only; a browser ignores it over plain http anyway.
 */
export function securityHeaders(nodeEnv = process.env.NODE_ENV) {
  return [
    { key: "Referrer-Policy", value: "same-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    ...(nodeEnv === "production"
      ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
      : []),
  ];
}

/**
 * The app's config plus: @minty/shared compiled from source (it ships .ts), the security headers
 * on every path (before the app's own headers), no X-Powered-By, and 127.0.0.1 allowed as a dev
 * origin. The app's own keys win, except that its transpilePackages and headers are added to.
 *
 * @template {import("next").NextConfig} T
 * @param {T} config
 * @returns {T}
 */
export function withMintyDefaults(config = /** @type {T} */ ({})) {
  const own = config.headers;
  return {
    poweredByHeader: false,
    allowedDevOrigins: ["127.0.0.1"],
    ...config,
    transpilePackages: Array.from(new Set(["@minty/shared", ...(config.transpilePackages ?? [])])),
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders() }, ...(own ? await own() : [])];
    },
  };
}

/**
 * Copy pdf.js's runtime assets (the worker, cMaps, standard fonts) out of the app's installed
 * `pdfjs-dist` into `public/pdfjs`, where `@minty/shared/pdfPreview` loads them same-origin -
 * never from a third-party CDN (v0.37; lifted from minty-payment-request-web's next.config.ts).
 * Call it at the top of next.config.ts: Node evaluates that file at the start of both `next dev`
 * and `next build`, so the copy always matches the installed version. `public/pdfjs` is
 * gitignored. An app without `pdfjs-dist` installed yet (a fresh clone before `npm ci`) is
 * skipped; a failed copy stops the start, since every PDF preview would fail without it.
 */
export function copyPdfjsAssets(root = process.cwd()) {
  const src = join(root, "node_modules", "pdfjs-dist");
  if (!existsSync(src)) return;
  const dest = join(root, "public", "pdfjs");
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  for (const [from, to] of [
    ["build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
    ["cmaps", "cmaps"],
    ["standard_fonts", "standard_fonts"],
  ]) {
    cpSync(join(src, from), join(dest, to), { recursive: true });
  }
}
