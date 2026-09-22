// Reindex all pieces to Typesense — run: npx tsx scripts/reindex-typesense.ts
// For small dataset (<10k), simple import is fine. For zero-downtime on large dataset,
// use aliasing: create cotwb_pieces_20250101, backfill, swap alias cotwb_pieces -> new (optional, not needed here).
import { db } from "@/lib/db/client";
import { buildRecord, ensureTypesenseCollection, getCollectionName, hasTypesenseAdmin } from "@/lib/search/typesense";
import Typesense from "typesense";

async function main() {
  if (!hasTypesenseAdmin()) {
    console.error("Typesense not configured — set TYPESENSE_HOST and TYPESENSE_API_KEY");
    process.exit(1);
  }
  console.log(`Ensuring collection ${getCollectionName()}...`);
  await ensureTypesenseCollection();

  console.log("Fetching pieces...");
  const rows = await db.query.pieces.findMany({
    with: { author: true },
  });
  const records = rows.map((r) => buildRecord(r, r.author));

  console.log(`Indexing ${records.length} records to ${getCollectionName()} via upsert...`);
  const host = process.env.TYPESENSE_HOST!;
  const apiKey = process.env.TYPESENSE_API_KEY!;
  const port = process.env.TYPESENSE_PORT ? Number(process.env.TYPESENSE_PORT) : 443;
  const protocol = process.env.TYPESENSE_PROTOCOL || "https";
  const client = new Typesense.Client({
    nodes: [{ host, port, protocol }],
    apiKey,
    connectionTimeoutSeconds: 2,
  });
  // Use import with action: upsert for idempotent backfill
  const result = await client
    .collections(getCollectionName())
    .documents()
    .import(records as unknown as Record<string, unknown>[], { action: "upsert" });
  console.log("Import result:", result.slice(0, 2));
  console.log("Done. Alias swap not needed for small dataset; for zero-downtime, create new collection and alias swap (see TYPESENSE_COLLECTION alias docs).");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
