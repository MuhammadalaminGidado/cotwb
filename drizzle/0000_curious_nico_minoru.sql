CREATE TYPE "public"."reaction_type" AS ENUM('like', 'inspiring', 'resonates');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('draft', 'submitted', 'in_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'group', 'private');--> statement-breakpoint
CREATE TABLE "collection_comments" (
	"comment_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	CONSTRAINT "collection_comments_comment_id_collection_id_pk" PRIMARY KEY("comment_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "collection_pieces" (
	"collection_id" uuid NOT NULL,
	"piece_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "collection_pieces_collection_id_piece_id_pk" PRIMARY KEY("collection_id","piece_id")
);
--> statement-breakpoint
CREATE TABLE "collection_reactions" (
	"reaction_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	CONSTRAINT "collection_reactions_reaction_id_collection_id_pk" PRIMARY KEY("reaction_id","collection_id"),
	CONSTRAINT "collection_reactions_user_collection_type_unique" UNIQUE("collection_id","reaction_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(256) NOT NULL,
	"slug" varchar(256) NOT NULL,
	"description" text,
	"creator_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"body" text NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_group_user_unique" UNIQUE("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "piece_comments" (
	"comment_id" uuid NOT NULL,
	"piece_id" uuid NOT NULL,
	CONSTRAINT "piece_comments_comment_id_piece_id_pk" PRIMARY KEY("comment_id","piece_id")
);
--> statement-breakpoint
CREATE TABLE "piece_reactions" (
	"reaction_id" uuid NOT NULL,
	"piece_id" uuid NOT NULL,
	CONSTRAINT "piece_reactions_reaction_id_piece_id_pk" PRIMARY KEY("reaction_id","piece_id"),
	CONSTRAINT "piece_reactions_user_piece_type_unique" UNIQUE("piece_id","reaction_id")
);
--> statement-breakpoint
CREATE TABLE "piece_tags" (
	"piece_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "piece_tags_piece_id_tag_id_pk" PRIMARY KEY("piece_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "piece_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"piece_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"body" text NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pieces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(256) NOT NULL,
	"slug" varchar(256) NOT NULL,
	"body" text NOT NULL,
	"author_id" uuid NOT NULL,
	"visibility" "visibility" DEFAULT 'public' NOT NULL,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"prompt_id" uuid,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pieces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"creator_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "reaction_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"piece_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"status" "review_status" NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar(64) NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"is_writer" boolean DEFAULT false NOT NULL,
	"username" varchar(64) NOT NULL,
	"display_name" varchar(128),
	"bio" text,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "writing_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"description" text,
	"creator_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "writing_groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "collection_comments" ADD CONSTRAINT "collection_comments_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_comments" ADD CONSTRAINT "collection_comments_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_pieces" ADD CONSTRAINT "collection_pieces_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_pieces" ADD CONSTRAINT "collection_pieces_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_reactions" ADD CONSTRAINT "collection_reactions_reaction_id_reactions_id_fk" FOREIGN KEY ("reaction_id") REFERENCES "public"."reactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_reactions" ADD CONSTRAINT "collection_reactions_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_group_id_writing_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."writing_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_comments" ADD CONSTRAINT "piece_comments_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_comments" ADD CONSTRAINT "piece_comments_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_reactions" ADD CONSTRAINT "piece_reactions_reaction_id_reactions_id_fk" FOREIGN KEY ("reaction_id") REFERENCES "public"."reactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_reactions" ADD CONSTRAINT "piece_reactions_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_tags" ADD CONSTRAINT "piece_tags_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_tags" ADD CONSTRAINT "piece_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_versions" ADD CONSTRAINT "piece_versions_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece_versions" ADD CONSTRAINT "piece_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_piece_id_pieces_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."pieces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_groups" ADD CONSTRAINT "writing_groups_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;