---
name: subagent-delegation
description: Defines how work is delegated to subagents in this project — delegation is opt-in and never happens unasked, because a subagent buys wall-clock time rather than budget; delegated work runs on sonnet, with nothing cheaper below it and judgement work kept inline rather than sent to opus; and every result that comes back is verified before it is used or reported. Apply this skill whenever spawning an agent, choosing a model for delegated work, planning to split a task across agents, or relaying what a subagent reported.
---

# Subagent Delegation

## Delegation is opt-in

**A subagent costs more than it saves.** It starts cold, re-derives context this session
already holds, and the main thread pays for its prompt and its report on top of the work
itself. What delegation buys is wall-clock time and a clean context window — not budget.
On a project constrained by usage limits, that trade is usually the wrong way round.

So: **spawn a subagent only when Angelika asks for one** — by naming an agent type, saying
"use a subagent", or invoking a skill that runs in one.

Two cases are worth raising as a suggestion. Describe the split and let her decide; do not
spawn on your own initiative:

- **Genuinely independent work streams** across separate files, where nothing has to be
  held in one head at once and running them in parallel would save real time
- **A wide sweep whose intermediate output is bulk noise** — searching many files to answer
  one narrow question — where a subagent's report keeps the raw material out of this context

Never delegate work you already have the context for, single-file changes, one-shot
searches, or a task merely described as "thorough" or "multi-part".

## Choose the model explicitly, per task

Never let a delegated task inherit the model by default. Pass `model` on every `Agent` call.
**Delegated work runs on `sonnet`.** There is no cheap tier: the work `haiku` would cover —
finding a file, listing occurrences of a symbol, running a known command — is a single tool
call that belongs inline rather than in a subagent, and what would be left for it are bulk
sweeps across many files, which is exactly where a missed hit stays silent.

| Model | Use for |
| --- | --- |
| `sonnet` | Everything that gets delegated: building components against a clear spec, tracing how existing features work, moderate refactors, drafting tests for settled behaviour, writing code, testing in browser, applying design decisions, and mechanical sweeps across many files. |

**There is deliberately no cheaper tier than `sonnet` here.** The work a cheap
model would be safe on — locating a file, listing occurrences of a symbol,
running a known command and reporting its output — is a single Glob, Grep or
Bash call that the section above already says to do inline rather than
delegate. What would actually be left for it is bulk mechanical work across
many files, and that is precisely where a miss is silent: "no other
occurrences" is the confident, plausible, wrong answer, and it costs more to
re-verify than the model saved. The line between mechanical and judgement is
blurry in this codebase anyway, because the conventions reach everywhere — a
straightforward rename runs into the message catalogs soon enough.

**And deliberately no more expensive one.** Genuinely hard work — architecture
decisions, design plans, interaction flows, cross-cutting refactors, subtle bug
hunts, code review, hard trade-off analysis, and anything touching
accessibility, extension permissions/privacy or the i18n catalogs — is work to
keep inline, where the context already exists, rather than paying a second
`opus` to acquire it first. That is the case where delegation most clearly
costs more than it saves. Delegate to `opus` only if Angelika explicitly asks.

If a task splits into a hard part and an ordinary one, keep the hard part here
and delegate only the ordinary half.

## Verify what comes back

A subagent's report is a claim, not a result. Before building on it or repeating it:

- Read the files it says it changed — do not trust a summary of a diff.
- Re-run the check it says passed (`pnpm check`); do not quote its word for a green run.
- Confirm any project rule it was supposed to honour actually holds — English-only code, no
  hardcoded user-facing strings, both message catalogs in sync, no new permission in the
  manifest.

This holds for `opus` as much as for `sonnet` — a subagent of any model reports on work you did not watch, and a confident summary is the easiest thing in the world to write. If verification fails, correct it here rather than sending the task back around; a second round trip costs more than the fix.

## Reporting

Relay what the delegated work actually produced, including what it got wrong and what you
had to fix. Never present an unverified subagent claim as a finished result.
