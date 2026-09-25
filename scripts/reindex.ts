// Reindex all pieces to Algolia — run: npx tsx scripts/reindex.ts
import { db } from "@/lib/db/client";
import { buildRecord, configureAlgoliaIndex, getAdminClient, getIndexName, hasAlgolia } from "@/lib/search/algolia";

async function main() {
  if (!hasAlgolia()) {
    console.error("Algolia not configured — set ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY");
    process.exit(1);
  }
  console.log(`Configuring index ${getIndexName()}...`);
  try {
    await configureAlgoliaIndex();
  } catch (e) {
    console.warn("configureAlgoliaIndex failed (key may lack settings ACL) — continuing to indexing:", (e as Error).message);
  }

  console.log("Fetching pieces...");
  const rows = await db.query.pieces.findMany({
    with: { author: true },
  });
  const records = rows.map((r) => buildRecord(r, r.author));

  console.log(`Indexing ${records.length} records to ${getIndexName()}...`);
  const client = getAdminClient();
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
