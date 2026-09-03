# AGENTS.md — Chip of the Writer's Block (COTWB) App

This file defines how agents collaborate on this codebase. Five roles: **Planner**, **Coder/Tester**, **Critic**, **Integrator**, **Tracker**. Reference `PLAN.md` for the phase-by-phase spec — this file governs *how* agents work through it, not *what* to build.
Always use lts node version: `nvm use 22.19.0` (via `export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"`).

---

## Roles

### Planner

Owns sequencing and scope. Does not write application code.

**Responsibilities**
- Break the current phase (from `PLAN.md`) into discrete, independently-verifiable tasks before handing off to Coder/Tester.
- Resolve ambiguity in the spec *before* implementation starts — if a build-plan step is underspecified, the Planner decides the concrete approach and states it explicitly, rather than leaving it for the Coder to improvise.
- Own the "stop and flag for human review" triggers already listed at the end of `PLAN.md` (missing/invalid Clerk keys or webhook secret, missing email config when notification features are reached, missing S3/R2 credentials). Planner is the one who notices these, not Coder mid-implementation.
- Sequence tasks so dependent work isn't started early — e.g. don't hand off Phase 4 review-queue UI before Phase 3 auth/role helpers (`canWrite`, `canModerate`) exist. Note the one deliberate exception in the plan: task 3.8 (contextual auth modal) is *specified* in Phase 3 but can't actually be *wired up* until Phase 6's comment/reaction components exist — don't let Coder mark 3.8 done until that wiring is in place, even though the spec for it lives earlier.
- After Critic flags an issue, Planner decides whether it's a Coder fix, a scope change, or worth raising to the human.
- Once Phase 5 (public-facing UI) exists, run `find-animation-opportunities` to scope where motion genuinely adds value before handing out UI tasks — it also flags what *not* to animate, which keeps Coder from over-applying `animate` everywhere. Periodically (e.g. once per phase from Phase 5 onward, and definitely before Phase 10) run `improve-animations` for a full-codebase audit and turn its prioritized findings into tasks, same as any other Planner-sourced work.

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
- For any UI/animation task, invoke the relevant installed `emilkowalski/skills` skill rather than implementing motion/design decisions from scratch: `emil-design-eng` for general UI craft while building any interactive component; `animate` when building a specific animation/transition (it picks curve, duration, and which properties to animate — supersedes eyeballing it against the Motion Conventions section below); `ask-sonner` if the task touches toast notifications; `pick-ui-library` when a task requires choosing between component libraries/approaches; `animation-vocabulary` as a terminology reference when writing or discussing motion code. Skip `apple-design`, `write-swift`, `animate-expo` — not applicable to this Next.js web project.
- Own local branch and commit lifecycle only: create the phase branch (`phase-N-<short-name>`) off `main` on the first task, commit to it sequentially as each task passes Critic's task-level review. That's the extent of Coder/Tester's git responsibility — pushing, opening a PR, and merging are **Integrator**'s job, not Coder/Tester's, and only happen after Critic's phase-level review (see Critic and Integrator below, and **Workflow**). Do not push the branch under any circumstance, including "just to back it up" — the branch stays local until Critic has reviewed the complete diff.

**Does not**
- Change scope or sequencing — that's Planner's call.
- Mark its own work as final — Critic reviews before a task is considered closed.
- Push the phase branch, open a PR, or merge — that's Integrator's job, gated on Critic's phase-level approval.

### Critic

Owns review. Does not write features, does not re-plan scope.

**Responsibilities**
- Review completed tasks against three things, in order: (1) the specific `PLAN.md` phase's acceptance criteria, (2) the Project Conventions below, (3) general code quality — leg 3 is backed by the `code-review-skill` (four-phase process: context → architecture → line-by-line → decision; findings labeled `blocking`/`important`/`nit`/`suggestion`/`praise`, which double as the "specific, actionable reason" every rejection already needs to have). Run it on every task except pure config/scaffolding (dependency bumps, folder setup, env var additions) — those get legs 1–2 only, running the full four-phase process on them is overhead without payoff. It auto-loads `reference/react.md`/`typescript.md` for this stack; don't skip it just because a task "looks small" — that's exactly the size of task where an easy-to-miss issue slips through on a skim.
- Verify security-relevant claims by demanding proof, not trusting the summary — e.g. "unauthenticated requests are rejected" must be checked by looking at the actual guard in the Server Action, not by reading a comment claiming it's handled.
- Actively hunt for the specific failure modes this project is prone to (see **Known drift risks** below) rather than doing a generic pass.
- For any task that touched UI/animation, also run `review-animations` against the diff — it checks motion quality/timing/consistency against a stricter rule set than the Motion Conventions section can enumerate by hand, and than `code-review-skill`'s `react.md` guide covers. Treat a `review-animations` failure the same as any other rejection reason.
- At phase close, once every task's individual commit has passed task-level review, do a second, phase-level pass over the **complete local branch diff** (`git diff main...phase-N-<name>`) *before anything is pushed* — this is the gate in **Workflow** step 6, and it's deliberately a local review, not a PR review, because nothing should reach GitHub until this passes. Use it to look across the whole phase for issues no single task's review would surface (inconsistency between two tasks, a convention violated in one file but not caught because review happened file-by-file). Only a pass here authorizes Integrator to push and open the PR — a phase-level rejection goes back to Coder/Tester the same as any task rejection, and the branch stays local until it's re-reviewed and passes.
- Reject work back to Coder/Tester with a specific, actionable reason — never a vague "looks off." If the issue is a plan problem rather than an implementation problem, route it to Planner instead of asking Coder to guess at a fix.
- Has no authority to approve scope changes — if fixing an issue properly requires expanding scope, that goes back to Planner.

**Does not**
- Implement fixes itself.
- Change the plan.

### Integrator

Owns push, PR, and merge mechanics. Does not evaluate code quality or correctness — that's already been decided by the time work reaches this role.

**Responsibilities**
- Act only after Critic's phase-level pre-push review (above) has passed — this is the one and only trigger. Never push, open a PR, or merge on any other basis, including a request from Coder/Tester or Planner to "just push it."
- Push the phase branch, then open the PR against `main` using the `create-pull-request` skill (handles commit analysis, PR template, `gh pr create` — don't hand-roll this).
- Merge once the PR is open and any CI checks attached to it pass. Since Critic already reviewed the complete diff before push, this is not a second content review — Integrator is checking that the PR mechanically reflects what was approved (right branch, right base, no surprise commits snuck in between review and push) and that CI is green, not re-litigating code quality.
- If something looks different between what Critic approved and what's about to be pushed (extra commits, a rebase that changed content), stop and send it back to Critic rather than pushing anyway — Integrator is a checkpoint, not a rubber stamp.

**Does not**
- Judge code quality, correctness, or convention adherence — that's Critic's job, already done before this role acts.
- Decide scope or sequencing.
- Push, open a PR, or merge without a prior Critic pass on that exact diff.

### Tracker

Owns status visibility. Does not implement, review, or plan — purely reports state.

**Responsibilities**
- Maintain `PROGRESS.md` (format below) as a fixed-size status table — never grows, one row per phase, always.
- Update on three triggers: a task-level Critic pass (update the `~` detail), a phase-level Critic pass (branch is now cleared to push, still `~` — the phase isn't done until it's actually merged), or Integrator completing the merge (flip the phase row to `x`). Never re-derive status by scanning code, `PLAN.md`, or prior conversation — Tracker has no verification role, it relays signals it's handed, nothing else. If a caller asks Tracker to "check where things stand," the answer is "read `PROGRESS.md`," not a re-audit.
- Edit with a targeted single-line replacement (the one phase row, or the `NEXT` line) — never rewrite the whole file for a one-line change. The file's fixed row count makes this cheap and mechanical.
- Report only what's actually verified (passed Critic + acceptance criteria met) as `x`. A task Coder/Tester believes finished but Critic hasn't passed stays `~`, not `x`.
- Keep the `NEXT` line current — it's the single line Planner (or a human) reads to resume work without scanning the table or `PLAN.md`. Update it in the same edit as the row it corresponds to.

**Does not**
- Judge whether work is correct — that's Critic's job. Tracker reports Critic's verdict, doesn't form its own.
- Decide what's next — that's Planner's job. Tracker shows the cursor, doesn't choose where it points.
- Re-scan the project to "confirm" state — the whole point of the design below is that Tracker never needs to.

**`PROGRESS.md` format**

Fixed 11 rows (one per phase, 0–10) plus a header and a cursor line — this is the entire budget, it never grows regardless of how many tasks run inside a phase:

```
NEXT: 3.3 — Clerk webhook handler
BLOCKED: none

P  Status  Detail
0  x
1  x
2  x
3  ~       3.1 x, 3.2 x, 3.3 pending
4  .
5  .
6  .
7  .
8  .
9  .
10 .
```

- Status codes: `.` pending, `~` in progress, `x` done, `!` blocked.
- `Detail` column is only populated for the `~` (in-progress) row — one short clause, sub-task codes only, no prose. Every other row leaves it blank; a `x` row doesn't need to explain itself, `PLAN.md` already has that.
- `NEXT` is always exactly one line: `<task id> — <short task name>`, copied from `PLAN.md`'s own numbering, not restated in Tracker's words.
- `BLOCKED` is `none` or `<phase>.<task> — <short reason>`. One line, no elaboration — the actual detail lives in whatever Planner escalation note prompted it, not here.
- Reading this file costs a fixed ~15 lines regardless of project size or how many tasks have completed — that's the token-usage goal. Anything that would make an entry longer (a rejection reason, a design note) belongs in a Critic comment or Planner note, not `PROGRESS.md`.

---

## Workflow

```
Per task (on the phase branch, local only):
  Planner → task spec → Coder/Tester → implementation + tests → Critic → pass/reject
                  ↑                                                  |          |
                  └──────────────── reject (plan issue) ─────────────┘          ↓
                                                                             Tracker
                                                                          (updates PROGRESS.md
                                                                           on every pass)

At phase close, once every task above has passed (branch still local, not pushed):
  Critic → phase-level review of full local diff → pass/reject
                    |
              reject → back to Coder/Tester (branch stays local)
                    |
                  pass
                    ↓
              Integrator → push branch → open PR (create-pull-request) → merge once CI green
                                                                                  ↓
                                                                    Tracker flips phase row to done
```

1. Planner pulls the next unfinished phase from `PLAN.md`, breaks it into tasks, hands the first task to Coder/Tester.
2. Coder/Tester implements, tests, self-checks against acceptance criteria, hands off to Critic.
3. Critic reviews. Pass → next task. Reject → back to Coder/Tester (implementation issue) or Planner (plan/spec issue), with a specific reason either way.
4. A phase is only complete when every task in it has passed Critic review AND the phase's overall **Acceptance** line in `PLAN.md` is verified true, not just each sub-task individually.
5. Branch per phase, not per task: Coder/Tester creates `phase-N-<short-name>` off `main` on the first task of a phase, and commits to it sequentially as each task passes Critic's task-level review — one commit per task, not one giant commit at phase close.
6. On phase close, once every task has passed task-level review, Critic reviews the complete local branch diff (phase-level, pre-push — see Critic above). Only after that pass does Integrator push the branch and open a PR (via `create-pull-request`) targeting `main`, then merge once CI is green. Coder/Tester never pushes; Critic never reviews an already-pushed PR for content — by the time it's on GitHub, the content review is done and Integrator is just executing the mechanics.
7. Tracker updates `PROGRESS.md` immediately after each task-level Critic pass, each phase-level Critic pass, and Integrator's merge (the actual phase-close event) — a targeted edit to the one affected row plus the `NEXT` line, never a full-file rewrite.

---

## Project Conventions

These are load-bearing across all five roles — Critic should reject any work that violates them, Coder should not deviate from them, Planner should not schedule work in a way that skips them.

- **Query layer is the single source of truth** for visibility/reviewStatus filtering (`lib/db/queries/`). No page, Server Action, or component re-implements this filtering inline.
- **Comment/reaction polymorphism uses Option B** (separate join tables per commentable type — `pieceComments`/`collectionComments`, `pieceReactions`/`collectionReactions`), not a `type`+`id` discriminator column. Real FKs required.
- **Three separate permission gates, not a hierarchy**: `canInteract(user)` (any registered user — comments, reactions), `canWrite(user)` (`isWriter` flag or `role === 'admin'`), `canModerate(user)` (`role === 'admin'` only). Never conflate these or use inline `role === ...` checks scattered across files — always call the helper.
- **Theme tokens only** — no hardcoded hex/Tailwind-default-palette classes anywhere outside `theme/tokens.css`. This is checked by grep as part of Critic's review from Phase 1 onward.
- **zod validation required** on every Server Action input, before it touches the DB.
- **Server Action vs API route**: Server Action unless something outside the app's own UI needs to call it (webhooks, presigned uploads). Critic should question any new `api/` route that doesn't fit one of those two cases.
- **Server Components by default**; client components only where interactivity genuinely requires it (editor, comment thread, reaction bar, forms with local state).

## Motion Conventions

These rules are the fallback/reference layer — the installed `emilkowalski/skills` (`animate`, `emil-design-eng`, `review-animations`, etc., wired into the Coder and Critic responsibilities above) are the actual mechanism enforcing this in practice and take precedence where they're more specific. This section exists so the rules are legible without opening a skill file, and so Critic has something concrete to cite in a rejection. Applies wherever UI work happens (Phase 1 theming, Phase 4 editor UI, Phase 5 discovery pages, Phase 6 comment/reaction UI, Phase 10 theme application).

- **Animate `transform` and `opacity` only** — never `top`/`left`/`width`/`height` or other layout-triggering properties. If a layout-affecting change needs to animate, use `transform` (translate/scale) to fake it.
- **Motion is feedback, not decoration.** Every animation should communicate a state change (opened, dismissed, loading, error) — if it's not doing that, cut it.
- **Duration by scale**: small UI (button press, toggle, reaction) ~100–150ms; medium (dropdown, modal, toast) ~200–300ms; avoid anything past ~400ms for a UI transition — it reads as sluggish, not deliberate.
- **Easing is a token, not a one-off.** Define named eases in `theme/tokens.css` alongside color tokens (e.g. `--ease-out`, `--ease-spring`) — components reference the token, never inline a bezier curve per-component. Default to an ease-out curve for entrances, ease-in for exits; avoid `linear` and default `ease` (both read as robotic/default-y).
- **Interruptible, not queued.** An animation in progress (e.g. a toast dismissing) must be able to reverse or redirect cleanly if triggered again mid-transition — don't let animations queue up and play out of sync with current state. This matters most for the comment/reaction optimistic-UI components (6.4/6.5) and the toast/modal patterns used across the review queue and moderation UI.
- **Respect `prefers-reduced-motion`** — every non-trivial transition needs a reduced-motion fallback (instant or near-instant), not just a slower version of the same animation.
- **Default state is subtle.** Reach for animation to clarify a transition, not to impress — the elements list in Phase 1's `frontend-design` skill guidance (typography, spacing, color) carries more of the "distinctive" feel than motion should; motion should feel inevitable, not showy.

Critic should reject any new interactive component (toast, modal, dropdown, optimistic comment/reaction, drag interaction) that animates a layout property, hardcodes an easing curve instead of using a token, or has no `prefers-reduced-motion` handling.

## Known drift risks

Things Critic should specifically check for, because they're the likeliest failure modes on a plan this long:

1. Auth checks that exist client-side (hiding a button) but not server-side (the Server Action itself). Always verify by calling the action path, not by reading the UI.
2. Visibility/reviewStatus filtering reimplemented inline in a new page instead of routed through the shared query functions.
3. A new UI component introducing a raw hex value or a Tailwind default color class instead of a token.
4. `canWrite`/`canModerate` logic drifting back toward a rank-based check (leftover instinct from the earlier reader→writer→editor model this project explicitly moved away from).
5. Comments/reactions implemented with a `commentableType` string + loose `commentableId` instead of the join-table pattern.
6. A new interactive component (toast, modal, optimistic comment/reaction) animating `top`/`left`/`width`/`height` instead of `transform`/`opacity`, or hardcoding an easing curve instead of using the `--ease-*` tokens.
7. Critic skipping `code-review-skill` on a task because it "looks small" — the exemption is for pure config/scaffolding only, not for small-but-substantive changes, which are exactly where a skimmed review misses something.

---

## Reference

- `PLAN.md` — phase-by-phase spec, source of truth for scope and acceptance criteria.
- `auth-flow.md` — screen-by-screen UX spec for the Clerk auth flow (sign-in/up, onboarding, contextual modal, theming). Phase 3 tasks 3.6–3.9 implement this.
- `PROGRESS.md` — fixed-size status table, maintained by Tracker. Read the `NEXT` line for where to resume — no need to scan `PLAN.md` or the codebase first.
- `theme/tokens.css` — color tokens, do not hardcode colors elsewhere.
- `theme/README.md` — token usage rules (created in Phase 1.4 of the build plan).

**Installed skills this file assumes are present** (install if missing, then restart the session so they're discovered — see the note on skill loading being startup-only):
```
npx skills add emilkowalski/skills -a opencode
npx skills add https://github.com/cline/cline/tree/main/.agents/skills/create-pull-request -a opencode
npx skills add awesome-skills/code-review-skill -a opencode
```
`pr-reviewer-skill` isn't used here — content review happens on the local diff before push (Critic's phase-level pass), so there's never an already-open PR left for a skill like that to meaningfully review; `create-pull-request` is used by Integrator purely for the push/PR mechanics after that review has passed; `code-review-skill` backs Critic's general-code-quality leg on every non-trivial task, with `review-animations` layered on top for anything UI/motion-related.