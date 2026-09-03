// const KEY_PREFIXES = ["pk_test", "pk_live", "sk_test", "sk_live", "whsec"];
// const PLACEHOLDER_SUFFIX =
//   /^(x+|your[_-]?key|your[_-]?secret|changeme|placeholder|example|replace[_-]?me)$/i;

// function isPlaceholderKey(key: string): boolean {
//   for (const prefix of KEY_PREFIXES) {
//     if (key.startsWith(`${prefix}_`)) {
//       const rest = key.slice(prefix.length + 1);
//       return PLACEHOLDER_SUFFIX.test(rest);
//     }
//   }
//   return false;
// }

export function hasClerk(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  if (!key.startsWith("pk_test_") && !key.startsWith("pk_live_")) return false;
  return true;
}

export function hasValidClerkKeys(): boolean {
  return hasClerk() && (process.env.CLERK_SECRET_KEY?.length ?? 0) > 0;
}
