---
name: subagent-delegation
description: Defines how work is delegated to subagents in this project — Claude decides itself when a task belongs in a subagent, but announces the split with a reason and waits for Angelika's confirmation before spawning; delegated work runs on sonnet, haiku is never used, judgement work stays inline on opus and never fans out into parallel opus agents; and every result that comes back is verified before it is used or reported. Apply this skill whenever spawning an agent, choosing a model for delegated work, planning to split a task across agents, or relaying what a subagent reported.
---

# Subagent Delegation

## The point is credits, not wall-clock time

A subagent starts cold. It re-derives context this session already holds, and the main
thread pays for its prompt and its report on top of the work itself. Delegation is
therefore only worth it when the subagent's context stays *out* of this one — a long
mechanical sweep, a browser session full of snapshots, a build log nobody needs verbatim.
Where the context is already here, doing the work here is cheaper.

Speed is not a reason. Never split a task across agents to finish sooner.

## Propose, then spawn

Claude decides when delegation is warranted — do not wait to be asked. But do not spawn
unannounced either. The sequence is always:

1. Say in one or two sentences **what** goes to the subagent, **which model** it runs on,
   and **why** that is cheaper than doing it here. Name what stays in the main thread.
2. Wait for Angelika's confirmation. That confirmation is the request to spawn.
3. Spawn, with `model` passed explicitly.

Do not bundle the proposal and the `Agent` call into one turn, and do not treat a general
"go ahead" on the overall task as consent for a split she has not seen.

**Delegate when** the work is settled enough to hand over and its intermediate output is
bulk noise:

- Implementing against a spec that is already decided
- Driving the browser through a test plan that already exists (see `CLAUDE.md`,
  "Driving the extension in a real browser") — the accessibility snapshots and screenshots
  are the single largest context cost in this project
- Mechanical sweeps across many files: a rename, a mass import fix, a lint-rule migration
- A wide read-only search where only the answer matters, not the files read
- Drafting tests for behaviour that is already settled

**Keep inline** — never delegate:

- Anything the session already has the context for
- Single-file changes and one-shot searches
- A task merely described as "thorough" or "multi-part"
- Deciding *what* to build, or how the UI should behave
- Accessibility, extension permissions/privacy, and the i18n catalogs. These are the three
  places where a wrong answer is confident, plausible and silent, and two of them raise
  their own skills to `high` effort for exactly that reason.
- The final `pnpm check` before handover

If a task splits into a hard part and an ordinary one, keep the hard part here and
delegate only the ordinary half. Write the spec first; a subagent sent off to figure out
the spec for itself is the expensive failure mode.

## Model per task

Never let a delegated task inherit its model. Pass `model` on every `Agent` call.

| Model | Where it runs | Work |
| --- | --- | --- |
| `opus` | The main thread, inline | Planning, architecture, design and interaction decisions, subtle bug hunts, code review, trade-off analysis, accessibility, privacy/permissions, i18n catalogs, and the final verification of anything a subagent hands back. |
| `sonnet` | Subagents | Everything delegated: implementing a settled spec, browser test runs, moderate refactors, mechanical sweeps, wide searches, drafting tests for settled behaviour. |
| `haiku` | Nowhere | **Never used in this project, under any circumstances.** |

**Why `haiku` is excluded outright.** What it would be safe on — locating a file, listing
occurrences of a symbol, running a known command — is a single Glob, Grep or Bash call that
belongs inline anyway. What would actually be left for it is bulk work across many files,
and that is precisely where a miss is silent: "no other occurrences" is the confident,
plausible, wrong answer, and re-verifying it costs more than the model saved. The line
between mechanical and judgement is blurry here regardless, because the conventions reach
everywhere — a straightforward rename runs into the message catalogs soon enough.

**Why `opus` stays in the main thread.** A second `opus` would have to buy the context this
one already has before it could think, so delegating judgement work is where delegation most
clearly costs more than it saves. Concretely:

- Never spawn parallel `opus` agents. Fan-out is a wall-clock optimisation, and wall-clock
  time is not the constraint on this project.
- Never spawn an `opus` agent at all unless Angelika asks for one by name. If it seems
  warranted, that is the signal to do the work here instead.

## Verify what comes back

A subagent's report is a claim, not a result. Before building on it or repeating it:

- Read the files it says it changed — do not trust a summary of a diff.
- Re-run the check it says passed (`pnpm check`); do not quote its word for a green run.
- Confirm any project rule it was supposed to honour actually holds — English-only code, no
  hardcoded user-facing strings, both message catalogs in sync, no new permission in the
  manifest.
- For a browser run, treat "looks right" as unverified. The judgement about whether the UI
  is usable belongs here; the subagent supplies the observations, not the verdict.

If verification fails, correct it here rather than sending the task back around; a second
round trip costs more than the fix.

## Reporting

Relay what the delegated work actually produced, including what it got wrong and what you
had to fix. Never present an unverified subagent claim as a finished result.
