# Chip of the Writer's Block (COTWB) — Agent Build Plan

Stack: Next.js (App Router) + TypeScript + Drizzle + Postgres + Tailwind + Tiptap + Inngest + Clerk.
Execution model: each phase is a checkpoint. Agent should not proceed to next phase until acceptance criteria for current phase pass. Commit after each numbered step.

---

## Phase 0 — Project Scaffolding

**0.1** Init Next.js app (App Router, TypeScript, Tailwind, ESLint).

**0.2** Install deps:
```
drizzle-orm drizzle-kit pg @clerk/nextjs svix
@tiptap/react @tiptap/starter-kit
inngest
zod
```

**0.3** Set up folder structure:
```
app/(public)/ app/(auth)/ app/(app)/ app/(admin)/ app/api/webhooks/
lib/db/ lib/db/queries/ lib/auth.ts lib/actions/
jobs/
components/editor/ components/ui/
theme/
```

**0.4** Env setup: `.env.local` with `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `INNGEST_*`, S3/R2 creds placeholders.

**Acceptance:** app boots on `next dev`, empty pages render per route group, no TS errors.

---

## Phase 1 — Theming Foundation (provision only, no palette yet)

Do this BEFORE any UI component work so nothing gets built with hardcoded colors.

**1.1** Create `theme/tokens.css` — define all color tokens as CSS custom properties under `:root` and `[data-theme="dark"]`, using placeholder values (e.g. `--color-bg`, `--color-surface`, `--color-text-primary`, `--color-text-muted`, `--color-accent`, `--color-accent-contrast`, `--color-border`, `--color-danger`, `--color-success`). Do not hardcode a palette — leave placeholder greys, real values come later from user spec.

**1.2** Wire `tailwind.config.ts` to reference the CSS vars (`colors: { bg: 'var(--color-bg)', ... }`) rather than static hex — every future component uses Tailwind classes like `bg-bg`, `text-primary`, never raw hex or Tailwind default palette classes (`bg-blue-500` etc. are banned in this codebase).

**1.3** Add a `ThemeProvider` (client component, `components/theme-provider.tsx`) that toggles `data-theme` on `<html>`, persists choice (cookie, not localStorage — SSR needs to read it to avoid flash).

**1.4** Add `theme/README.md` documenting: how to swap tokens when the user supplies their palette, which tokens exist, and that no component should ever hardcode a color value.

**Acceptance:** toggling `data-theme` on html element visibly changes bg/text of a placeholder page. Grep codebase for hex codes outside `theme/tokens.css` — should return nothing once later phases are built. This is the gate: every phase from here forward is checked against "no hardcoded colors."

---

## Phase 2 — Database Schema

**2.1** Write `lib/db/schema.ts` (Drizzle) — full schema:
- `users` (local row synced from Clerk via webhook — `clerkId`, `role`, `isWriter`, profile fields; no `accounts`/`sessions` tables, Clerk owns session state)
- `pieces` (title, slug, body, authorId, visibility enum, reviewStatus enum, publishedAt, timestamps)
- `pieceVersions`
- `reviews`
- `tags`, `pieceTags`
- `collections`, `collectionPieces`
- `comments` (id, authorId, parentId, body, timestamps)
- `pieceComments`, `collectionComments` (join tables — see polymorphism decision, Option B)
- `reactions` (id, userId, type enum, timestamps)
- `pieceReactions`, `collectionReactions` (join tables, same pattern as comments; unique constraint per user/target/type)
- `writingGroups`, `memberships`
- `prompts`

**2.2** Enums: `visibility` (`public|group|private`), `reviewStatus` (`draft|submitted|in_review|approved|rejected`), `reactionType` (keep small — e.g. `like|inspiring|resonates`).

**2.3** Generate + run migration (`drizzle-kit generate`, `drizzle-kit push` or migrate).

**2.4** Seed script (`lib/db/seed.ts`): a handful of users, tags, draft/approved pieces for local dev.

**Acceptance:** migration runs clean on empty DB, seed populates without FK errors, `drizzle-kit studio` shows correct relations.

---

## Phase 3 — Auth (Clerk)

Clerk handles identity, session, and login UI entirely — no custom credentials/magic-link flow, no password storage, no session table to maintain. The app still needs a local `users` row per person for FKs (`pieces.authorId`, `comments.authorId`, etc.) and for the app-specific `role`/`isWriter` fields Clerk doesn't know about — that row is kept in sync via a Clerk webhook, not built as a parallel auth system.

**3.1** Install and configure Clerk (`@clerk/nextjs`). Wrap root layout in `<ClerkProvider>`. Add `middleware.ts` using `clerkMiddleware()` to protect `(app)` and `(admin)` route groups; `(public)` stays unauthenticated-accessible.

**3.2** Local `users` table stores app-specific state only — `clerkId` (unique, FK target for everything else), `role` (`user | admin`), `isWriter` (boolean, default `false`), plus display fields you don't want to round-trip to Clerk on every read (username/slug for profile URLs). Do not duplicate Clerk-owned fields (email, password, session) locally.

**3.3** `app/api/webhooks/clerk/route.ts` — Clerk webhook handler (`user.created`, `user.updated`, `user.deleted`) using `svix` to verify the signature, upserts/deletes the local `users` row keyed on `clerkId`. This is the only place local user rows get created — never create one ad hoc from a Server Action.

**3.4** Roles: `role` enum column on local `users` is `user | admin` — this is not a writer/reader distinction, it's base-vs-admin. Separate `isWriter` boolean column, default `false`, toggleable by the user themselves (opt-in, e.g. a "become a writer" action in settings) via a Server Action that updates the local row — role/isWriter live in Postgres, not Clerk metadata, so there's one place permission state can drift, not two. Read access is not role-gated at all — public/group pieces are visible per `pieces.visibility` regardless of auth state; only `group`-visibility requires a `memberships` row, not a role check.

**3.5** `lib/auth.ts` — thin wrapper joining Clerk's session to the local row:
```ts
import { auth as clerkAuth } from '@clerk/nextjs/server';

async function currentUser() {
  const { userId: clerkId } = await clerkAuth();
  if (!clerkId) return null;
  return db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
}

function canInteract(user: User | null) {
  return !!user;
}
function canWrite(user: User | null) {
  return !!user && (user.isWriter || user.role === 'admin');
}
function canModerate(user: User | null) {
  return user?.role === 'admin';
}
```
Server Actions and Server Components call `currentUser()` once, then `canWrite`/`canModerate`/`canInteract` off the result — never call Clerk's `auth()` directly outside this file, so the local-row join stays in one place.

**Acceptance:** Clerk login/signup/logout works via its hosted or embedded components; a `user.created` webhook event produces a matching local `users` row with `role: 'user'`, `isWriter: false`; unauthenticated users can read public content but hit a Clerk redirect on write/comment actions; a registered user without `isWriter` is blocked from `write/new` with a clear "enable writing" prompt; unauthorized access to `(admin)` redirects; `currentUser()` returns the joined local row in both Server Components and Server Actions; deleting a user in Clerk removes (or soft-deletes, agent's call — flag the tradeoff) the local row via webhook.

---

## Phase 4 — Core Writing Flow (Piece CRUD + Review)

**4.1** `lib/actions/pieces.ts` Server Actions: `createDraft`, `updatePiece` (also writes `pieceVersions` row), `submitForReview`, `deletePiece`.

**4.2** `lib/actions/reviews.ts`: `approvePiece`, `rejectPiece` (admin-only via canModerate, writes `reviews` row, updates `pieces.reviewStatus` and `publishedAt` on approve).

**4.3** Tiptap editor component (`components/editor/piece-editor.tsx`) — client component, autosave draft via debounced Server Action call.

**4.4** Pages:
- `app/(app)/write/new/page.tsx` — new draft
- `app/(app)/write/[id]/edit/page.tsx` — edit + submit
- `app/(admin)/review-queue/page.tsx` — list `submitted`/`in_review` pieces, approve/reject UI

**4.5** Visibility enforcement in query layer (`lib/db/queries/pieces.ts`) — every read path filters by visibility + reviewStatus based on viewer's auth state + memberships (group access), independent of role. Centralize this — do not duplicate the filter logic per page.

**Acceptance:** full loop works — draft → submit → admin approves → piece becomes publicly visible and queryable; rejected pieces stay hidden from public queries; visibility rules hold for group-only content.

---

## Phase 5 — Public Discovery

**5.1** `app/(public)/page.tsx` — feed of approved+public pieces, Server Component, paginated.

**5.2** `app/(public)/pieces/[slug]/page.tsx` — piece detail, ISR (`revalidate` on approve/edit via `revalidatePath`).

**5.3** `app/(public)/authors/[username]/page.tsx` — author profile + their public pieces.

**5.4** Tags: `pieceTags` join, filter UI on feed page.

**5.5** Search: Postgres `tsvector` column + GIN index on `pieces.body`/`title`; query fn in `lib/db/queries/search.ts`; `app/(public)/search/page.tsx`.

**Acceptance:** feed only shows approved+public; search returns relevant results; tag filter narrows correctly; ISR revalidates within expected window after publish.

---

## Phase 6 — Comments & Reactions (registered users only)

Both comments and reactions require an authenticated session — no anonymous comment/react, regardless of `isWriter`/`role`. This is a separate gate from `canWrite`: reading is open to everyone, but any write-adjacent interaction (comment, reply, react) requires a registered account.

```ts
function canInteract(user: User | null) {
  return !!user; // any registered user — reader is enough, isWriter/role irrelevant here
}
```

**6.1** `reactions` table: `id`, `userId` (FK), `commentableType`/`commentableId` (same join-table pattern as comments — Option B, `pieceReactions`/`collectionReactions`), `type` (enum, e.g. `like|inspiring|resonates` — keep it small, avoid an open-ended emoji picker for v1), unique constraint on `(userId, targetId, type)` to prevent duplicate reactions from the same user.

**6.2** `lib/actions/comments.ts`: `postComment(commentableType, commentableId, body, parentId?)`, `deleteComment` — both call `canInteract(user)` first and throw/redirect if unauthenticated.

**6.3** `lib/actions/reactions.ts`: `addReaction`, `removeReaction` — same `canInteract` gate, plus the unique constraint as a DB-level backstop against duplicate submits.

**6.4** `components/comment-thread.tsx` — client component, recursive render for threading, optimistic post via `useOptimistic`. Unauthenticated viewers see comments (read-only) plus a prompt to log in instead of the comment form.

**6.5** `components/reaction-bar.tsx` — client component, optimistic toggle. Same logged-out treatment: reactions visible, interaction disabled with a login prompt.

**6.6** Wire both into piece detail and collection pages.

**Acceptance:** nested replies render correctly to arbitrary depth (or a sane max, e.g. 5); comment/react on piece and on collection both work through the same actions with correct join-table writes; unauthenticated requests to `postComment`/`addReaction` are rejected server-side (not just hidden client-side — confirm by calling the action directly without a session); duplicate reactions from the same user are blocked at the DB level.

---

## Phase 7 — Collections, Groups, Prompts

**7.1** Collections: CRUD (admin-role curates), `collectionPieces` join, public collection pages.

**7.2** Writing groups: create/join, `memberships` table, group-only piece visibility respected in query layer from Phase 4.5.

**7.3** Prompts: simple CRUD, listing page, optional "pieces written for this prompt" linkage (nullable `promptId` FK on `pieces`).

**Acceptance:** group-only pieces invisible to non-members; collections render curated piece order; prompt linkage optional and non-breaking if absent.

---

## Phase 8 — Background Jobs (Inngest)

**8.1** `jobs/scheduled-publish.ts` — cron or event-triggered, flips `pieces` with a future `publishedAt` and `approved` status live.

**8.2** `jobs/digest-email.ts` — periodic digest of new approved pieces to followers/subscribers (stub email send if no provider configured yet — log instead, mark TODO).

**Acceptance:** manually trigger via Inngest dev server, confirm DB state changes as expected.

---

## Phase 9 — Moderation (admin tools)

**9.1** Reporting: `reports` table (reporterId, targetType, targetId, reason, status), Server Action to file, admin page to resolve.

**9.2** `app/(admin)/moderation/page.tsx` — queue of open reports.

**Acceptance:** report → appears in queue → admin resolves → status updates, reported content unaffected unless admin takes explicit action (no auto-hide).

---

## Phase 10 — Theme Application (once user supplies palette)

**10.1** Replace placeholder values in `theme/tokens.css` with user-specified palette for both `:root` (light) and `[data-theme="dark"]`.

**10.2** Visual QA pass across every page built in Phases 1–9 — confirm no hardcoded hex slipped in during earlier phases (re-run the grep check from 1.4).

**10.3** Add theme toggle UI component to nav (visible control wired to `ThemeProvider` from 1.3).

**Acceptance:** full app reflects real palette, toggle works with no flash-of-wrong-theme on load, zero hardcoded colors remain outside `theme/tokens.css`.

---

## Recommended agent skills for this build

If the coding agent has access to a skills system (e.g. Claude Code skills), these are the relevant ones for this project:

- **frontend-design** — use for every phase touching UI (Phase 1 theming, Phase 4 editor UI, Phase 5 discovery pages, Phase 6 comment threads, Phase 10 theme application). This is the one built-in skill directly relevant here; it governs the visual/typography decisions so pages don't default to generic template output.
- **A project-specific skill, worth creating via skill-creator, capturing the conventions that must hold across all 10 phases** — the things an agent working phase-by-phase over multiple sessions is most likely to drift on:
  - The visibility/reviewStatus filtering rule from 4.5 (query layer is the single source of truth, never re-implemented inline per page)
  - The comment polymorphism decision (Option B — join tables, not type+id columns)
  - The no-hardcoded-color rule from Phase 1/10 (tokens only, banned Tailwind default palette classes)
  - Use `canWrite(user)` / `canModerate(user)` helpers, never inline `role === ...` or `isWriter` checks scattered across pages
  - zod validation required on every Server Action input

  Capturing these once as a skill (rather than re-stating them in every phase prompt) keeps a long multi-session build consistent — this plan is 10 phases, likely several agent sessions, and these are exactly the rules that erode first under context pressure.

Skills like docx/pdf/pptx/xlsx aren't relevant here — no document-generation deliverables in this build.

## Notes for the agent

- Do not skip Phase 1 or build any component before it — retrofitting theme tokens into hardcoded-color components is expensive and error-prone; enforce the token system from the first component onward.
- Every Server Action must validate input with `zod` before touching the DB.
- Query layer (`lib/db/queries/`) is the single source of truth for visibility/review filtering — no page or action re-implements this logic inline.
- Stop and flag for human review if: Clerk API keys or webhook secret are missing/invalid, email sending isn't configured but digest/notification features are reached, or S3/R2 credentials are missing when upload features are reached.