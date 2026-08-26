---
name: subagent-delegation
description: Defines how work is delegated to subagents in this project — spawn subagents proactively when a task benefits from parallel work or specialized investigation, always choose the model explicitly per task (cheap model for mechanical work, strong model for work that needs judgement), and every result that comes back is verified before it is used or reported. Apply this skill whenever spawning an agent, choosing a model for delegated work, planning to split a task across agents, or relaying what a subagent reported.
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
| `haiku` | Mechanical, fully specified work: locating files, listing occurrences of a symbol, straightforward renames, collecting facts, running a known command and reporting its output. |
| `sonnet` | Ordinary implementation and research needing some judgement: building a component against a clear spec, tracing how an existing feature works, moderate refactors, drafting tests for settled behaviour. |
| `opus` | Genuinely hard work: architecture decisions, cross-cutting refactors, subtle bug hunts, and anything touching accessibility, extension permissions/privacy, or the i18n catalogs — areas where a wrong answer is expensive and quiet. |

Two failure modes to avoid symmetrically: a strong model on a trivial search is waste; a cheap model on a judgement call produces confident, plausible, wrong output.

If a task splits into a hard part and a mechanical part, split the delegation too rather than paying the harder model for both.

## Verify what comes back

A subagent's report is a claim, not a result. Before building on it or repeating it to the user:

- Read the files it says it changed — do not trust a summary of a diff.
- Re-run the check it says passed (`pnpm lint`, `pnpm test`, `pnpm build`), do not quote its word for a green run.
- Confirm any project rule it was supposed to honour actually holds — English-only code, no hardcoded user-facing strings, both message catalogs in sync, no new permission in the manifest.

The cheaper the model, the more this matters. If verification fails, correct it here rather than sending the task back around.

## Reporting

Relay what the delegated work actually produced, including what it got wrong and what you had to fix. Never present an unverified subagent claim as a finished result.

## Your model choice for this project's work

When working directly in this project (not delegating), select your model per phase to optimize token efficiency:

- **`opus`** – for conceptual and judgement work: architecture decisions, design plans, interaction flows, approach recommendations, UX/accessibility considerations, hard trade-off analysis, and code review
- **`sonnet`** – for implementation: writing code, testing in the browser, refactoring, debugging, applying design decisions

This split prevents wasting expensive compute on mechanical work while ensuring judgement calls have the full picture.
