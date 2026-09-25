DROP INDEX IF EXISTS "pieces_search_vector_idx";--> statement-breakpoint
ALTER TABLE "pieces" DROP COLUMN IF EXISTS "search_vector";