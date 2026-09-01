import "dotenv/config";
import { db, pool } from "./client";
import {
  collections,
  collectionPieces,
  memberships,
  pieces,
  pieceTags,
  prompts,
  tags,
  users,
  writingGroups,
} from "./schema";

async function seed() {
  console.log("Seeding...");

  // ─── Users ────────────────────────────────────────────────────
  const [admin, alice, bob] = await db
    .insert(users)
    .values([
      {
        clerkId: "clerk_admin_001",
        role: "admin",
        isWriter: true,
        username: "admin",
        displayName: "Admin",
        bio: "Site administrator",
      },
      {
        clerkId: "clerk_alice_001",
        role: "user",
        isWriter: true,
        username: "alice",
        displayName: "Alice Writer",
        bio: "Fiction and essays",
      },
      {
        clerkId: "clerk_bob_001",
        role: "user",
        isWriter: false,
        username: "bob",
        displayName: "Bob Reader",
        bio: "Avid reader",
      },
    ])
    .returning();

  console.log(`  users: ${admin.username}, ${alice.username}, ${bob.username}`);

  // ─── Tags ─────────────────────────────────────────────────────
  const insertedTags = await db
    .insert(tags)
    .values([
      { name: "fiction", slug: "fiction" },
      { name: "poetry", slug: "poetry" },
      { name: "essay", slug: "essay" },
      { name: "memoir", slug: "memoir" },
      { name: "workshop", slug: "workshop" },
    ])
    .returning();

  console.log(`  tags: ${insertedTags.map((t) => t.name).join(", ")}`);

  // ─── Writing Group ────────────────────────────────────────────
  const [group] = await db
    .insert(writingGroups)
    .values({
      name: "Morning Writers",
      slug: "morning-writers",
      description: "Early risers who write before the world wakes.",
      creatorId: admin.id,
    })
    .returning();

  await db.insert(memberships).values([
    { groupId: group.id, userId: admin.id },
    { groupId: group.id, userId: alice.id },
  ]);

  console.log(`  group: ${group.name}`);

  // ─── Prompts ──────────────────────────────────────────────────
  const [prompt1, prompt2] = await db
    .insert(prompts)
    .values([
      {
        title: "A letter you never sent",
        description: "Write the letter you never had the courage to send.",
        creatorId: admin.id,
      },
      {
        title: "The last bookstore",
        description: "Describe the last bookstore on earth.",
        creatorId: alice.id,
      },
    ])
    .returning();

  console.log(`  prompts: ${prompt1.title}, ${prompt2.title}`);

  // ─── Collections ──────────────────────────────────────────────
  const [col1, col2] = await db
    .insert(collections)
    .values([
      {
        title: "Staff Picks",
        slug: "staff-picks",
        description: "Curated by our editors",
        creatorId: admin.id,
      },
      {
        title: "New Voices",
        slug: "new-voices",
        description: "Debut pieces from emerging writers",
        creatorId: alice.id,
      },
    ])
    .returning();

  console.log(`  collections: ${col1.title}, ${col2.title}`);

  // ─── Pieces (draft, submitted, approved) ──────────────────────
  const [draft, submitted, approved] = await db
    .insert(pieces)
    .values([
      {
        title: "The Quiet Hours",
        slug: "the-quiet-hours",
        body: "<p>There is a particular silence...</p>",
        authorId: alice.id,
        visibility: "public",
        reviewStatus: "draft",
      },
      {
        title: "Letters to the City",
        slug: "letters-to-the-city",
        body: "<p>Dear city, you have changed...</p>",
        authorId: alice.id,
        visibility: "public",
        reviewStatus: "submitted",
        promptId: prompt1.id,
      },
      {
        title: "When the Lights Went Out",
        slug: "when-the-lights-went-out",
        body: "<p>It was the winter of 2019...</p>",
        authorId: alice.id,
        visibility: "public",
        reviewStatus: "approved",
        promptId: prompt2.id,
        publishedAt: new Date(),
      },
    ])
    .returning();

  console.log(
    `  pieces: ${draft.slug} (${draft.reviewStatus}), ${submitted.slug} (${submitted.reviewStatus}), ${approved.slug} (${approved.reviewStatus})`,
  );

  // ─── Piece ↔ Tag ──────────────────────────────────────────────
  await db.insert(pieceTags).values([
    { pieceId: draft.id, tagId: insertedTags[0].id },
    { pieceId: approved.id, tagId: insertedTags[0].id },
    { pieceId: approved.id, tagId: insertedTags[2].id },
  ]);

  // ─── Collection ↔ Pieces ──────────────────────────────────────
  await db.insert(collectionPieces).values([
    { collectionId: col1.id, pieceId: approved.id, position: 0 },
    { collectionId: col2.id, pieceId: approved.id, position: 0 },
  ]);

  console.log("Seed complete.");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
