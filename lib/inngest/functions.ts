import { inngest } from "@/lib/inngest/client";
import { deletePieceFromAlgolia, upsertPieceToAlgolia } from "@/lib/search/algolia";

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

export const functions = [syncPieceToAlgolia];
