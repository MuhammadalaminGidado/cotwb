// Re-export Algolia-backed search — tsvector decommissioned (see lib/search/algolia.ts).
// This file remains the single import path for search (PLAN.md 5.5: lib/db/queries/search.ts)
// so pages don't need to change when the engine swaps.
export { searchAlgolia as searchPieces } from "@/lib/search/algolia";
export type { SearchResult } from "@/lib/search/algolia";

// Legacy count helper kept for compatibility but now derived via Algolia hits length.
// If callers need a count without fetching rows, they should use searchAlgolia with limit.
export async function searchPiecesCount(): Promise<number> {
  throw new Error("searchPiecesCount is removed — use searchAlgolia result length");
}
