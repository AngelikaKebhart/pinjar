---
name: subagent-delegation
description: Defines how work is delegated to subagents in this project — spawn subagents proactively when a task benefits from parallel work or specialized investigation, always choose the model explicitly per task (opus for work that needs judgement, sonnet for everything else), and every result that comes back is verified before it is used or reported. Apply this skill whenever spawning an agent, choosing a model for delegated work, planning to split a task across agents, or relaying what a subagent reported.
---

# Subagent Delegation

## When to delegate at all

Spawn a subagent when:
- The user explicitly asks for delegation (naming a subagent, saying "use a subagent", or invoking a skill that runs in one)
- A task naturally splits into independent work streams that can run in parallel (e.g., multiple files to audit, multiple searches to run)
- A task requires specialized expertise that another agent type offers (e.g., code-reviewer, explorer)
- The task is large enough that a fresh context (subagent starting cold) pays for itself in clean work rather than carrying forward context

Do NOT delegate:
- Work you can do faster inline (single files, single searches, one-shot analysis)
- Tasks described as "thorough" or "several parts" without natural parallelism — do it inline instead
- Work where you already have the full context and spawning would be wasteful

## Choose the model explicitly, per task

Never let a delegated task inherit the model by default. Pass `model` on every `Agent` call, matched to what the task actually demands:

| Model | Use for |
| --- | --- |
| `sonnet` | The default for delegated work: building components against a clear spec, tracing how existing features work, moderate refactors, drafting tests for settled behaviour, writing code, testing in browser, applying design decisions, and mechanical sweeps across many files. |
| `opus` | Genuinely hard work: architecture decisions, design plans, interaction flows, cross-cutting refactors, subtle bug hunts, code review, hard trade-off analysis, and anything touching accessibility, extension permissions/privacy, or the i18n catalogs — areas where a wrong answer is expensive and quiet. |

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

If a task splits into a hard part and an ordinary one, split the delegation
too rather than paying `opus` for both.

## Verify what comes back

A subagent's report is a claim, not a result. Before building on it or repeating it to the user:

- Read the files it says it changed — do not trust a summary of a diff.
- Re-run the check it says passed (`pnpm lint`, `pnpm test`, `pnpm build`), do not quote its word for a green run.
- Confirm any project rule it was supposed to honour actually holds — English-only code, no hardcoded user-facing strings, both message catalogs in sync, no new permission in the manifest.

This holds for `opus` as much as for `sonnet` — a subagent of any model reports on work you did not watch, and a confident summary is the easiest thing in the world to write. If verification fails, correct it here rather than sending the task back around.

## Reporting

Relay what the delegated work actually produced, including what it got wrong and what you had to fix. Never present an unverified subagent claim as a finished result.
