/**
 * Safe internal redirect helper — prevents open-redirect via external URLs.
 * Only allows path-absolute URLs (starts with "/" but not "//" and no scheme).
 */
export function isSafeRedirect(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith("/")) return null;
  if (url.startsWith("//")) return null;
  if (url.includes(":") || url.includes("\\")) return null;
  // Disallow control chars and spaces
  if (/\s/.test(url)) return null;
  return url;
}

export function getSafeRedirect(
  url: string | null | undefined,
  fallback: string,
): string {
  return isSafeRedirect(url) ?? fallback;
}
