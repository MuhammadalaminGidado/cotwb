// Reindex all pieces to Algolia — run: npx tsx scripts/reindex.ts
import { db } from "@/lib/db/client";
import { buildRecord, configureAlgoliaIndex, getIndexName, getClient, hasAlgolia } from "@/lib/search/algolia";

async function main() {
  if (!hasAlgolia()) {
    console.error("Algolia not configured — set ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY");
    process.exit(1);
  }
  console.log(`Configuring index ${getIndexName()}...`);
  await configureAlgoliaIndex();

  console.log("Fetching pieces...");
  const rows = await db.query.pieces.findMany({
    with: { author: true },
  });
  const records = rows.map((r) => buildRecord(r, r.author));

  console.log(`Indexing ${records.length} records to ${getIndexName()}...`);
  const client = getClient();
  await client.replaceAllObjects({
    indexName: getIndexName(),
    objects: records as unknown as Record<string, unknown>[],
    batchSize: 1000,
  });
  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
