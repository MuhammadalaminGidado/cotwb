const PLACEHOLDER_PATTERNS = [
  "aGVhbHRoeS1yYW0tNDg2Ni", // healthy-ram-4866 — seeded placeholder in .env.local
];

function isPlaceholderKey(key: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => key.includes(p));
}

export function hasClerk(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  if (!key.startsWith("pk_test_") && !key.startsWith("pk_live_")) return false;
  if (isPlaceholderKey(key)) return false;
  return true;
}

export function hasValidClerkKeys(): boolean {
  return hasClerk() && (process.env.CLERK_SECRET_KEY?.length ?? 0) > 0;
}
