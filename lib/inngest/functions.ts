import { inngest } from "@/lib/inngest/client";
import { deletePieceFromAlgolia, upsertPieceToAlgolia } from "@/lib/search/algolia";
import { deletePieceFromTypesense, upsertPieceToTypesense } from "@/lib/search/typesense";

export const syncPieceToAlgolia = inngest.createFunction(
  { id: "sync-piece-to-algolia", retries: 3, concurrency: { limit: 5 }, triggers: [{ event: "piece/sync" }] },
  async ({ event }: { event: { data: { pieceId: string; action: "upsert" | "delete" } } }) => {
    const { pieceId, action } = event.data;
    if (action === "delete") {
      await deletePieceFromAlgolia(pieceId);
      return { pieceId, action, ok: true };
    }
    await upsertPieceToAlgolia(pieceId);
    return { pieceId, action, ok: true };
  },
);

export const syncPieceToTypesense = inngest.createFunction(
  { id: "sync-piece-to-typesense", retries: 3, concurrency: { limit: 5 }, triggers: [{ event: "piece/sync" }] },
  async ({ event }: { event: { data: { pieceId: string; action: "upsert" | "delete" } } }) => {
    const { pieceId, action } = event.data;
    if (action === "delete") {
      await deletePieceFromTypesense(pieceId);
      return { pieceId, action, ok: true };
    }
    await upsertPieceToTypesense(pieceId);
    return { pieceId, action, ok: true };
  },
);

export const functions = [syncPieceToAlgolia, syncPieceToTypesense];
