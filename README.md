# ai-test-harness

**Measure what AI coding tools actually cost you — per task type, per validated result — so tooling
decisions are driven by data instead of demos.**

## Why this exists

Every team piloting AI tooling (Claude Code, Cursor, Copilot, Codex CLI, raw API loops) hits the
same wall: vendors quote prices per token, leaderboards rank models on puzzle benchmarks, and neither
answers the question a POC is actually asking — *"for the work my team does, which tool reaches a
correct, verified result for the least money, and how often does it lie about being done?"*

This harness answers that question with four ideas most benchmarks skip:

1. **Only validated results count.** Every case has a mechanical gate (a test suite, an exact-match
   check, a structural check) run by the harness — never the agent's own "done!" claim. Tokens spent
   on failed runs still count in the numerator. The headline metrics are **tokens per validated
   outcome (TPV)** and **cost per validated outcome (CPV)**.
2. **Failure has kinds, and the kind matters.** Every run is classified verified-delivered /
   honest-block / honest-fail / **fake-green** (claimed success, gate red). A cheap tool that lies
   costs more downstream than an expensive one that doesn't — fake-green rate sits next to CPV in
   every report. And a tool that recognizes a dead end in 5k tokens beats one that burns 400k
   failing: **tokens-to-honest-block** is a first-class metric.
3. **Task type is the independent variable.** A tool that wins at building from a spec may lose at
   debugging or document work. Results are a matrix (task type × tool × model), never one number.
4. **Hallucination is measured mechanically first.** Cited files that don't exist, APIs that aren't
   in the installed package, tests "run" that never appear in the transcript — all checkable without
   a judge, and the last one directly measures fake-green narration.

The full design — metrics, validation rules, judge protocol, threats to validity, build plan — is in
**[SPEC.md](./SPEC.md)**. Read it before building.

## What's in the box

| Path | What |
|---|---|
| `SPEC.md` | The complete harness specification and build plan |
| `cases/teh-v1-seed-cases.json` | 585 frozen seed prompts: 7 v1 task types (code, docs, grounded transforms, Q&A) plus 100 `interactive` and 85 `ambitious` cases frozen now, activated in v2 |
| `exemplars/` | One **fully promoted, runnable** case per task type — frozen workspace, executable gate, reference solution, stored fail/pass proofs |
| `exemplars/run-proofs.mjs` | Conformance kit (see below) |
| `AUTHORING.md` | The playbook for promoting seed cases and authoring new ones |
| `tools/build-seed-cases.mjs` | Provenance: the generator that produced the seed set (runs only against its source corpus) |

## How to use it

**Today (spec + dataset + exemplars; the runner is not built yet):**

```sh
node exemplars/run-proofs.mjs
# expected: 6x "ok (untouched fails, reference passes)" + 1x judge-required, exit 0
```

That command is the ground truth for what "a gate" means here: each exemplar's gate is executed
against the untouched workspace (must fail) and against the reference solution (must pass). When you
build the runner, drive it against the exemplars until it reproduces `exemplars/expected-verdicts.json`
exactly — then you know your scoring is trustworthy before any expensive benchmark runs.

**Build order** (SPEC.md §12): runner skeleton + the `api-loop` control adapter first (a minimal
fixed scaffold over OpenRouter, so model-to-model comparisons aren't confounded by vendor harness
differences), then the commercial-tool adapters. Every adapter implements just three functions:
`provision(workspace)`, `run(prompt)`, `usage()`.

**Reading results:** the deliverable of a benchmark run is a decision scorecard — for each task type,
the cheapest tool that clears the validation-rate and honesty bars, plus the price of every
alternative. Rules that keep it honest: coverage is printed on every table, token counts are never
compared across model families (use CPV), and estimated token counts are never interleaved with
exact ones.

## Shaping the dataset to YOUR use cases

The 500 seed cases are a starting point, not a canon. The whole design assumes you'll reshape it —
efficiency measured on someone else's workload is only directionally useful.

**Subset it.** Every case has a `task_type`, `family`, and `tier`. If your team's reality is 70%
bugfix and grounded document work, benchmark that slice and ignore the rest. Results are only ever
reported per task type, so a subset is a valid benchmark — just report what ran.

**Replace prompts with your own.** A case needs five things (schema in SPEC.md §2.1):

1. a prompt, phrased the way your users actually ask;
2. a frozen `workspace/` — the starting files (empty is fine for build-from-scratch tasks);
3. a **gate** — a command that exits 0 only on genuine success, run by the harness, never the agent;
4. for judged types, a gold answer + rubric;
5. **fail/pass proofs** — the gate shown failing on the untouched workspace and passing on a
   reference solution. A case without both proofs is not admissible; a gate that has never been
   watched failing is assumed broken.

Copy the matching exemplar's directory shape (`AUTHORING.md` maps task type → exemplar → gate
recipe) rather than inventing conventions. The judgment calls are already made there: how deliverables
are addressed (`prompt_addendum`), the gate CLI contract, decoy design for grounded artifacts,
invariant checks for refactors, anti-tamper hashes for test files.

**Derive cases from your own repos.** The highest-value cases are planted-defect bugfixes and
migrations in a snapshot of *your* codebase: freeze a workspace from a real (sanitized) repo, plant a
reproducible defect with a failing test, gate on the test. Mark `provenance` so contamination
concerns stay visible (SPEC.md §9).

**Add trap cases.** The cheapest reliable hallucination signal: ask about a function that doesn't
exist (correct answer: "it doesn't exist"), or assert a wrong root cause in the prompt (correct
behavior: the agent contradicts you). Binary-scorable, no judge needed. Aim for ~2 per task type.

**Version, don't edit.** Once a case set has produced published numbers, its prompts are frozen.
New/changed prompts → new `case_set` name. Runs record which case-set version they executed, so
numbers stay comparable over time.

## Status

Spec, 585-case seed set, exemplars, and authoring playbook are complete. Runner, adapters, and
scorer are not yet built — start at SPEC.md §12 P0.
