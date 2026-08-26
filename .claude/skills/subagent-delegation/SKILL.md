---
name: subagent-delegation
description: Defines how work is delegated to subagents in this project — delegation is opt-in and never happens unasked because a subagent costs budget rather than saving it, delegated work runs on a cheap model (never opus), and every result that comes back is verified before it is used or reported. Apply this skill whenever spawning an agent, choosing a model for delegated work, planning to split a task across agents, or relaying what a subagent reported.
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

Never let a delegated task inherit the model by default. Pass `model` on every `Agent` call:

| Model | Use for |
| --- | --- |
| `haiku` | Mechanical, fully specified work: locating files, listing occurrences of a symbol, straightforward renames, collecting facts, running a known command and reporting its output. |
| `sonnet` | Everything else that gets delegated: implementation against a clear spec, tracing how an existing feature works, moderate refactors, drafting tests for settled behaviour, browser testing. |

**`opus` is deliberately absent from this table.** Work that needs Opus-grade judgement —
architecture decisions, accessibility, extension permissions and privacy, the i18n catalogs,
subtle bug hunts, hard trade-offs — is work to do inline, where the context already exists,
rather than paying a second Opus to acquire it first. Delegate to `opus` only if Angelika
explicitly asks for it.

If a task splits into a hard part and a mechanical part, keep the hard part here and
delegate only the mechanical half.

## Verify what comes back

A subagent's report is a claim, not a result. Before building on it or repeating it:

- Read the files it says it changed — do not trust a summary of a diff.
- Re-run the check it says passed (`pnpm check`); do not quote its word for a green run.
- Confirm any project rule it was supposed to honour actually holds — English-only code, no
  hardcoded user-facing strings, both message catalogs in sync, no new permission in the
  manifest.

The cheaper the model, the more this matters. If verification fails, correct it here rather
than sending the task back around — a second round trip costs more than the fix.

## Reporting

Relay what the delegated work actually produced, including what it got wrong and what you
had to fix. Never present an unverified subagent claim as a finished result.
