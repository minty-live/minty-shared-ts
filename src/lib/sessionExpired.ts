/**
 * "Your session has expired" (the user, 2026-11-19): when the Minty sign-in behind an app's token
 * has ended - 60 minutes without activity, or signed out - every API answers its 401 with
 * `reason: "session_expired"` (minty-shared-py `tokens.unauthorized_reason`). The app then shows
 * ONE pop-up (`SessionExpiredHost`, `@minty/shared/ui`) instead of an "Unauthorized" error, and OK
 * takes the person to the login page, which brings them back where they were. A 401 without the
 * reason is only the app's 30-minute token running out while the sign-in lives: renewed quietly,
 * no pop-up.
 *
 * A tiny store, so any fetch helper can raise it and one host drawn in the app's layout shows it.
 * It fires once: later 401s while it is up change nothing.
 */

export const SESSION_EXPIRED_REASON = "session_expired";

/**
 * The Minty in the pop-up's corner: the clock cat (minty-web's `public/portal/minty-clock.png`,
 * trimmed to the cat and saved as a 288px-high WebP). A contract like `CONTACT_ASSETS`: Next.js
 * cannot serve a file out of node_modules, so each app holds it and asserts this list in a test.
 */
export const SESSION_EXPIRED_CAT = "/session/minty-clock.webp";
export const SESSION_EXPIRED_ASSETS = [SESSION_EXPIRED_CAT] as const;

/** The 401 body names an ended sign-in. */
export function isSessionExpired(body: unknown): boolean {
  return (
    !!body &&
    typeof body === "object" &&
    (body as { reason?: unknown }).reason === SESSION_EXPIRED_REASON
  );
}

let loginUrl: string | null = null;
const listeners = new Set<() => void>();

/** Raise the pop-up; OK goes to `url` (the login page, carrying where to come back to). Once only. */
export function showSessionExpired(url: string): void {
  if (loginUrl !== null) return;
  loginUrl = url;
  listeners.forEach((listener) => listener());
}

/** The login address while the pop-up is up, else null. */
export function sessionExpiredUrl(): string | null {
  return loginUrl;
}

export function subscribeSessionExpired(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tests only: forget a raised pop-up. */
export function resetSessionExpiredForTests(): void {
  loginUrl = null;
  listeners.forEach((listener) => listener());
}
