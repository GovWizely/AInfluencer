export const DEFAULT_SIGNED_IN_PATH = "/inbox";
export const LOGIN_PATH = "/login";

const PROTECTED_PATH_PREFIXES = ["/inbox", "/settings"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Returns a same-origin relative path, or the default signed-in path when
 * `next` is missing or could redirect off-site (e.g. `//evil.com`).
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return DEFAULT_SIGNED_IN_PATH;
  }
  if (/[\\\u0000-\u001f]/.test(next)) {
    return DEFAULT_SIGNED_IN_PATH;
  }
  try {
    const base = "http://localhost";
    const url = new URL(next, base);
    if (url.origin !== base) return DEFAULT_SIGNED_IN_PATH;
    return url.pathname + url.search + url.hash;
  } catch {
    return DEFAULT_SIGNED_IN_PATH;
  }
}

export function loginPathFor(next: string): string {
  const safe = safeNextPath(next);
  if (safe === DEFAULT_SIGNED_IN_PATH) return LOGIN_PATH;
  return `${LOGIN_PATH}?${new URLSearchParams({ next: safe })}`;
}

/**
 * Supabase email templates pass `next` as the full `RedirectTo` URL. Keep only
 * the path so the host can never be attacker-controlled.
 */
export function nextPathFromRedirect(value: string | null | undefined) {
  if (value && /^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return safeNextPath(url.pathname + url.search + url.hash);
    } catch {
      return safeNextPath(null);
    }
  }
  return safeNextPath(value);
}
