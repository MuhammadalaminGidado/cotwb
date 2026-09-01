import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ──────────────────────────────────────────────────────────

export const visibilityEnum = pgEnum("visibility", [
  "public",
  "group",
  "private",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
]);

export const reactionTypeEnum = pgEnum("reaction_type", [
  "like",
  "inspiring",
  "resonates",
]);

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// ─── Users (Clerk-synced local row) ─────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 64 }).notNull().unique(),
  role: userRoleEnum("role").notNull().default("user"),
  isWriter: boolean("is_writer").notNull().default(false),
  username: varchar("username", { length: 64 }).notNull().unique(),
  displayName: varchar("display_name", { length: 128 }),
  bio: text("bio"),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── Pieces ─────────────────────────────────────────────────────────

export const pieces = pgTable("pieces", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  body: text("body").notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  visibility: visibilityEnum("visibility").notNull().default("public"),
  reviewStatus: reviewStatusEnum("review_status").notNull().default("draft"),
  promptId: uuid("prompt_id").references(() => prompts.id, {
    onDelete: "set null",
  }),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const pieceVersions = pgTable("piece_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  pieceId: uuid("piece_id")
    .notNull()
    .references(() => pieces.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  body: text("body").notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Reviews ────────────────────────────────────────────────────────

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  pieceId: uuid("piece_id")
    .notNull()
    .references(() => pieces.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: reviewStatusEnum("status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── Tags ───────────────────────────────────────────────────────────

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pieceTags = pgTable(
  "piece_tags",
  {
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => pieces.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.pieceId, t.tagId] })],
);

// ─── Collections ────────────────────────────────────────────────────

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  description: text("description"),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const collectionPieces = pgTable(
  "collection_pieces",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => pieces.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.pieceId] })],
);

// ─── Comments (Option B — join tables per parent type) ──────────────

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  body: text("body").notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): any => comments.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const pieceComments = pgTable(
  "piece_comments",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => pieces.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.pieceId] })],
);

export const collectionComments = pgTable(
  "collection_comments",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.collectionId] })],
);

// ─── Reactions (Option B — join tables per parent type) ─────────────

export const reactions = pgTable("reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: reactionTypeEnum("type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pieceReactions = pgTable(
  "piece_reactions",
  {
    reactionId: uuid("reaction_id")
      .notNull()
      .references(() => reactions.id, { onDelete: "cascade" }),
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => pieces.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.reactionId, t.pieceId] }),
    unique("piece_reactions_user_piece_type_unique").on(
      t.pieceId,
      // uniqueness per user/target/type is enforced via application logic
      // + a composite check on the joined reactions row — Drizzle unique()
      // here covers piece-level dedup; full cross-table constraint is handled
      // in migration SQL if needed.
      t.reactionId,
    ),
  ],
);

export const collectionReactions = pgTable(
  "collection_reactions",
  {
    reactionId: uuid("reaction_id")
      .notNull()
      .references(() => reactions.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.reactionId, t.collectionId] }),
    unique("collection_reactions_user_collection_type_unique").on(
      t.collectionId,
      t.reactionId,
    ),
  ],
);

// ─── Writing Groups + Memberships ───────────────────────────────────

export const writingGroups = pgTable("writing_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  description: text("description"),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => writingGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("memberships_group_user_unique").on(t.groupId, t.userId)],
);

// ─── Prompts ────────────────────────────────────────────────────────

export const prompts = pgTable("prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── Relations ──────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  pieces: many(pieces),
  pieceVersions: many(pieceVersions),
  reviews: many(reviews),
  comments: many(comments),
  reactions: many(reactions),
  memberships: many(memberships),
  collections: many(collections),
  writingGroups: many(writingGroups),
  prompts: many(prompts),
}));

export const piecesRelations = relations(pieces, ({ one, many }) => ({
  author: one(users, { fields: [pieces.authorId], references: [users.id] }),
  prompt: one(prompts, { fields: [pieces.promptId], references: [prompts.id] }),
  versions: many(pieceVersions),
  reviews: many(reviews),
  pieceTags: many(pieceTags),
  collectionPieces: many(collectionPieces),
  pieceComments: many(pieceComments),
  pieceReactions: many(pieceReactions),
}));

export const pieceVersionsRelations = relations(pieceVersions, ({ one }) => ({
  piece: one(pieces, {
    fields: [pieceVersions.pieceId],
    references: [pieces.id],
  }),
  author: one(users, {
    fields: [pieceVersions.authorId],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  piece: one(pieces, { fields: [reviews.pieceId], references: [pieces.id] }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  pieceTags: many(pieceTags),
}));

export const pieceTagsRelations = relations(pieceTags, ({ one }) => ({
  piece: one(pieces, { fields: [pieceTags.pieceId], references: [pieces.id] }),
  tag: one(tags, { fields: [pieceTags.tagId], references: [tags.id] }),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  creator: one(users, {
    fields: [collections.creatorId],
    references: [users.id],
  }),
  collectionPieces: many(collectionPieces),
  collectionComments: many(collectionComments),
  collectionReactions: many(collectionReactions),
}));

export const collectionPiecesRelations = relations(
  collectionPieces,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionPieces.collectionId],
      references: [collections.id],
    }),
    piece: one(pieces, {
      fields: [collectionPieces.pieceId],
      references: [pieces.id],
    }),
  }),
);

export const commentsRelations = relations(comments, ({ one, many }) => ({
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "commentReplies",
  }),
  replies: many(comments, { relationName: "commentReplies" }),
  pieceComments: many(pieceComments),
  collectionComments: many(collectionComments),
}));

export const pieceCommentsRelations = relations(pieceComments, ({ one }) => ({
  comment: one(comments, {
    fields: [pieceComments.commentId],
    references: [comments.id],
  }),
  piece: one(pieces, {
    fields: [pieceComments.pieceId],
    references: [pieces.id],
  }),
}));

export const collectionCommentsRelations = relations(
  collectionComments,
  ({ one }) => ({
    comment: one(comments, {
      fields: [collectionComments.commentId],
      references: [comments.id],
    }),
    collection: one(collections, {
      fields: [collectionComments.collectionId],
      references: [collections.id],
    }),
  }),
);

export const reactionsRelations = relations(reactions, ({ one, many }) => ({
  user: one(users, { fields: [reactions.userId], references: [users.id] }),
  pieceReactions: many(pieceReactions),
  collectionReactions: many(collectionReactions),
}));

export const pieceReactionsRelations = relations(pieceReactions, ({ one }) => ({
  reaction: one(reactions, {
    fields: [pieceReactions.reactionId],
    references: [reactions.id],
  }),
  piece: one(pieces, {
    fields: [pieceReactions.pieceId],
    references: [pieces.id],
  }),
}));

export const collectionReactionsRelations = relations(
  collectionReactions,
  ({ one }) => ({
    reaction: one(reactions, {
      fields: [collectionReactions.reactionId],
      references: [reactions.id],
    }),
    collection: one(collections, {
      fields: [collectionReactions.collectionId],
      references: [collections.id],
    }),
  }),
);

export const writingGroupsRelations = relations(
  writingGroups,
  ({ one, many }) => ({
    creator: one(users, {
      fields: [writingGroups.creatorId],
      references: [users.id],
    }),
    memberships: many(memberships),
  }),
);

export const membershipsRelations = relations(memberships, ({ one }) => ({
  group: one(writingGroups, {
    fields: [memberships.groupId],
    references: [writingGroups.id],
  }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

export const promptsRelations = relations(prompts, ({ one, many }) => ({
  creator: one(users, {
    fields: [prompts.creatorId],
    references: [users.id],
  }),
  pieces: many(pieces),
}));
