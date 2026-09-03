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
  // Block encoded traversal / scheme bypass (e.g. %2F%2F, %3A, %5C)
  try {
    const decoded = decodeURIComponent(url);
    if (decoded !== url) {
      // Re-validate decoded form
      if (decoded.startsWith("//") || decoded.includes(":") || decoded.includes("\\")) return null;
      if (decoded.includes("%2f") || decoded.includes("%2F") || decoded.includes("%3a") || decoded.includes("%3A"))
        return null;
    }
  } catch {
    return null;
  }
  if (url.toLowerCase().includes("%2f%2f") || url.toLowerCase().includes("%3a")) return null;
  return url;
}

export function getSafeRedirect(
  url: string | null | undefined,
  fallback: string,
): string {
  return isSafeRedirect(url) ?? fallback;
}
