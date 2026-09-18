UPDATE "users" SET "onboarding_completed_at" = NOW() WHERE "onboarding_completed_at" IS NULL;--> statement-breakpoint
