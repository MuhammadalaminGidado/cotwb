# AGENTS.md — Literary Community App

This file defines how agents collaborate on this codebase. Four roles: **Planner**, **Coder/Tester**, **Critic**, **Tracker**. Reference `PLAN.md` for the phase-by-phase spec — this file governs *how* agents work through it, not *what* to build.

---

## Roles

### Planner

Owns sequencing and scope. Does not write application code.

**Responsibilities**
- Break the current phase (from `PLAN.md`) into discrete, independently-verifiable tasks before handing off to Coder/Tester.
- Resolve ambiguity in the spec *before* implementation starts — if a PLAN step is underspecified, the Planner decides the concrete approach and states it explicitly, rather than leaving it for the Coder to improvise.
- Own the "stop and flag for human review" triggers already listed at the end of `PLAN.md` (missing/invalid Clerk keys or webhook secret, missing email config when notification features are reached, missing S3/R2 credentials). Planner is the one who notices these, not Coder mid-implementation.
- Sequence tasks so dependent work isn't started early — e.g. don't hand off Phase 4 review-queue UI before Phase 3 auth/role helpers (`canWrite`, `canModerate`) exist.
- After Critic flags an issue, Planner decides whether it's a Coder fix, a scope change, or worth raising to the human.

**Does not**
- Write or edit application code directly.
- Approve its own plan as complete — that's Critic's job.

### Coder/Tester

Owns implementation and verification of each task the Planner hands off.

**Responsibilities**
- Implement exactly the task scope handed off — no unrequested refactors of adjacent code, no scope creep into future phases.
- Write tests alongside implementation, not after: for Server Actions, this means at minimum a rejected-unauthenticated-call test and a happy-path test before moving on. For query layer functions (`lib/db/queries/`), test visibility/reviewStatus filtering directly rather than only through UI.
- Self-check against the phase's **Acceptance** criteria in `PLAN.md` before declaring a task done — do not hand off to Critic with acceptance criteria unmet.
- Follow existing conventions rather than introducing new patterns — see **Project Conventions** below. If a convention seems wrong for a specific case, flag it to Planner rather than silently deviating.
- Run the relevant checks locally before handoff: typecheck, lint, and (from Phase 1 onward) the hardcoded-color grep check.

**Does not**
- Change scope or sequencing — that's Planner's call.
- Mark its own work as final — Critic reviews before a task is considered closed.

### Critic

Owns review. Does not write features, does not re-plan scope.

**Responsibilities**
- Review completed tasks against three things, in order: (1) the specific `PLAN.md` phase's acceptance criteria, (2) the Project Conventions below, (3) general code quality (naming, dead code, obvious bugs).
- Verify security-relevant claims by demanding proof, not trusting the summary — e.g. "unauthenticated requests are rejected" must be checked by looking at the actual guard in the Server Action, not by reading a comment claiming it's handled.
- Actively hunt for the specific failure modes this project is prone to (see **Known drift risks** below) rather than doing a generic pass.
- Reject work back to Coder/Tester with a specific, actionable reason — never a vague "looks off." If the issue is a plan problem rather than an implementation problem, route it to Planner instead of asking Coder to guess at a fix.
- Has no authority to approve scope changes — if fixing an issue properly requires expanding scope, that goes back to Planner.

**Does not**
- Implement fixes itself.
- Change the plan.

### Tracker

Owns status visibility. Does not implement, review, or plan — purely reports state.

**Responsibilities**
- Maintain `PROGRESS.md` (format below), updated after every task passes Critic review and after every phase closes.
- Keep it terse — this is a status board, not a changelog. One line per phase, one line per in-flight task at most.
- Report only what's actually verified (passed Critic + acceptance criteria met) as done. A task Coder/Tester believes finished but Critic hasn't passed is `in progress`, not `done`.
- Surface blockers immediately — a phase stalled on a Planner human-escalation trigger should show as `blocked`, not silently omitted.

**Does not**
- Judge whether work is correct — that's Critic's job. Tracker reports Critic's verdict, doesn't form its own.
- Decide what's next — that's Planner's job. Tracker shows what's pending, doesn't sequence it.

**`PROGRESS.md` format**
```
# Progress

Phase 0 — Scaffolding             done
Phase 1 — Theming Foundation      done
Phase 2 — Database Schema         done
Phase 3 — Auth                    in progress (3.2 done, 3.3 in review)
Phase 4 — Core Writing Flow       pending
Phase 5 — Public Discovery        pending
Phase 6 — Comments & Reactions    pending
Phase 7 — Collections/Groups      pending
Phase 8 — Background Jobs         pending
Phase 9 — Moderation              pending
Phase 10 — Theme Application      pending

Blocked: none
```
Status values: `pending`, `in progress (<detail>)`, `blocked (<reason>)`, `done`. Nothing more elaborate than this — if it needs a paragraph, that belongs in Planner's notes or a Critic review comment, not here.

---

## Workflow

```
Planner → task spec → Coder/Tester → implementation + tests → Critic → pass/reject
                ↑                                                  |          |
                └──────────────── reject (plan issue) ─────────────┘          ↓
                                                                          Tracker
                                                                       (updates PROGRESS.md
                                                                        on every pass)
```

1. Planner pulls the next unfinished phase from `PLAN.md`, breaks it into tasks, hands the first task to Coder/Tester.
2. Coder/Tester implements, tests, self-checks against acceptance criteria, hands off to Critic.
3. Critic reviews. Pass → next task. Reject → back to Coder/Tester (implementation issue) or Planner (plan/spec issue), with a specific reason either way.
4. A phase is only complete when every task in it has passed Critic review AND the phase's overall **Acceptance** line in `PLAN.md` is verified true, not just each sub-task individually.
5. Commit after each task passes, not after each phase — smaller commits, easier to bisect.
6. Tracker updates `PROGRESS.md` immediately after each Critic pass and each phase close — never batched, so status is always current.

---

## Project Conventions

These are load-bearing across all four roles — Critic should reject any work that violates them, Coder should not deviate from them, Planner should not schedule work in a way that skips them.

- **Query layer is the single source of truth** for visibility/reviewStatus filtering (`lib/db/queries/`). No page, Server Action, or component re-implements this filtering inline.
- **Comment/reaction polymorphism uses Option B** (separate join tables per commentable type — `pieceComments`/`collectionComments`, `pieceReactions`/`collectionReactions`), not a `type`+`id` discriminator column. Real FKs required.
- **Three separate permission gates, not a hierarchy**: `canInteract(user)` (any registered user — comments, reactions), `canWrite(user)` (`isWriter` flag or `role === 'admin'`), `canModerate(user)` (`role === 'admin'` only). Never conflate these or use inline `role === ...` checks scattered across files — always call the helper.
- **Theme tokens only** — no hardcoded hex/Tailwind-default-palette classes anywhere outside `theme/tokens.css`. This is checked by grep as part of Critic's review from Phase 1 onward.
- **zod validation required** on every Server Action input, before it touches the DB.
- **Server Action vs API route**: Server Action unless something outside the app's own UI needs to call it (webhooks, presigned uploads). Critic should question any new `api/` route that doesn't fit one of those two cases.
- **Server Components by default**; client components only where interactivity genuinely requires it (editor, comment thread, reaction bar, forms with local state).

## Known drift risks

Things Critic should specifically check for, because they're the likeliest failure modes on a plan this long:

1. Auth checks that exist client-side (hiding a button) but not server-side (the Server Action itself). Always verify by calling the action path, not by reading the UI.
2. Visibility/reviewStatus filtering reimplemented inline in a new page instead of routed through the shared query functions.
3. A new UI component introducing a raw hex value or a Tailwind default color class instead of a token.
4. `canWrite`/`canModerate` logic drifting back toward a rank-based check (leftover instinct from the earlier reader→writer→editor model this project explicitly moved away from).
5. Comments/reactions implemented with a `commentableType` string + loose `commentableId` instead of the join-table pattern.

---

## Reference

- `PLAN.md` — phase-by-phase spec, source of truth for scope and acceptance criteria.
- `PROGRESS.md` — current status by phase, maintained by Tracker. Check this first for "what's done."
- `theme/tokens.css` — color tokens, do not hardcode colors elsewhere.
- `theme/README.md` — token usage rules (created in Phase 1.4 of the build plan).