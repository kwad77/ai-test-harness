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

## From clone to numbers: the step-by-step

Be clear about what you're holding: **this repo is a specification + dataset + acceptance tests. The
software that generates numbers does not exist yet — you (or an agent you hand this to) build it,
and the repo tells you exactly what "built correctly" means at every step.** No step below requires
asking the authors anything.

### Step 1 — Verify the ground truth on your machine (5 minutes)

```sh
git clone <this repo> && cd ai-test-harness
node exemplars/run-proofs.mjs   # needs Node 20+
```

**Expect:** `6x "ok (untouched fails, reference passes)" + 1x judge-required`, exit 0.
This proves the seven exemplar gates behave as documented on your machine. If this fails, stop —
nothing downstream can be trusted until it passes.

### Step 2 — Build the harness (the "execute the spec" step)

Hand `SPEC.md` to whoever is building — an engineer or a coding agent. The build order is SPEC §12:
runner skeleton + the `api-loop` control adapter first (a minimal fixed scaffold over OpenRouter, so
model-to-model comparisons aren't confounded by vendor harness differences). Every adapter is three
functions: `provision(workspace)`, `run(prompt)`, `usage()`.

**Expect:** days of work for P0, not hours and not weeks.
**Done when (mechanical, no judgment):** the built runner, executing gates through its own code path,
reproduces `exemplars/expected-verdicts.json` exactly, and writes per-run artifacts in the SPEC §8
layout. If the builder claims done and this check fails, it is not done.

### Step 3 — First real numbers: benchmark the exemplars

Run the built harness: 7 exemplar cases × 2+ models via `api-loop` × 5 repetitions.

**Expect:** your first genuine scorecard within an hour of Step 2 finishing, shaped exactly like the
mock below, with a coverage line reading `7 of 7 cases, 5 runs each`. Costs are small (single-digit
dollars). The numbers are honest but narrow — 7 cases ranks nothing reliably; this step exists to
prove the pipeline end-to-end and to catch scoring bugs while runs are cheap.

### Step 4 — Widen to the task types YOU care about

Pick the task types matching your team's real workload, then promote seed cases from
`cases/teh-v1-seed-cases.json` following `AUTHORING.md` (copy the matching exemplar's shape).

**Expect:** this is human authoring work the harness cannot do for you — roughly 30–60 minutes per
case (workspace artifact, gate, fail/pass proofs; gold + rubric for judged types). Budget it like
test-writing. You do NOT need all 585: ~10 promoted cases per task type you care about is enough for
a defensible per-type ranking (SPEC §8.5 publication bar).

For `explain`/`grounded-transform` judged scoring, pin the judge first (SPEC §5.3) — judged numbers
before judge-stability checks are noise.

### Step 5 — Add the tools you're actually evaluating

Build adapters for the commercial tools in your POC (SPEC §3): `claude-code` and `codex-cli` expose
usable usage logs; `cursor`/`copilot` land in the clearly-marked **estimated tier** because they hide
token counts.

**Expect:** the same model to cost somewhat different amounts under different harnesses — that
difference is real (system prompts, context injection) and is precisely what the `api-loop` control
rows let you isolate.

### Step 6 — Run the matrix and read the scorecard

Declare a run manifest (case set, SUTs, N=5, budget ceilings, pinned judges — SPEC §8), run it, and
read the per-task-type scorecards.

**Expect:** the output in the next section — per task type: the cheapest tool that clears your
validation-rate and honesty bars, the price of each alternative, fake-green flags with receipts.
Re-run the same frozen case set when vendors ship major updates; versioned case sets keep the
numbers comparable over time.

## What you should expect to get out of it

If you build the harness to this spec and run a benchmark, the end product is a **decision
scorecard** per task type — enough to walk into a tooling/procurement discussion with numbers instead
of impressions. It looks like this:

> **⚠ Everything below is a mock-up with invented numbers**, included to show the shape of the
> deliverable. No benchmark has been run yet.

```
CASE SET teh-v1 · TASK TYPE: bugfix · coverage: 10 of 10 cases, 5 runs each
─────────────────────────────────────────────────────────────────────────────────────────
SUT                          VR      CPV        TPV*       fake-green  med tokens   HRR
                                     $/valid    tok/valid  rate        to-honest-   /1k out
                                                           (headline)  block
─────────────────────────────────────────────────────────────────────────────────────────
api-loop / claude-sonnet-5   92%     $0.41      118k       0%          6.2k         0.3
claude-code / claude-opus-5  96%     $0.97      141k       0%          4.8k         0.1
api-loop / gpt-5-codex       88%     $0.52      —†         2%          19.4k        0.7
codex-cli / gpt-5-codex      90%     $0.66      —†         0%          11.0k        0.4
─────────────────────────────────────────────────────────────────────────────────────────
ESTIMATED TIER (token counts are lower bounds; do not compare with rows above)
cursor / claude-sonnet-5     94%     ≥$0.58     ≥97k       2%          ≥8.1k        0.2
─────────────────────────────────────────────────────────────────────────────────────────
* TPV comparable only within a model family (different tokenizers). Cross-family: use CPV.
† suppressed: cross-family token comparison.

RECOMMENDATION (bugfix): api-loop/claude-sonnet-5 clears the bars (VR ≥ 90%, fake-green = 0)
at the lowest cost. claude-code/claude-opus-5 buys +4pts validation rate and the fastest
honest-block for 2.4× the cost — worth it if failed fixes are expensive for you.
FLAG: api-loop/gpt-5-codex is the only SUT with nonzero fake-green (1 run claimed a fix,
gate red) — see runs/EX-BF-014/run-3/verdict.json.
```

You get one of these per task type, plus the cost-vs-validation-rate frontier plot across all task
types. Behind every number is a per-run receipt you can audit:

```jsonc
// results/teh-v1/api-loop__gpt-5-codex/BF-014/run-3/verdict.json  (mock)
{
  "outcome": "fake-green",
  "gate": { "exit": 1, "reason": "target test still failing" },
  "agent_claimed_success": true,
  "usage": { "tokens_in": 84210, "tokens_out": 9114, "cache_read": 61050, "cost_usd": 0.31, "token_source": "provider_api" },
  "halluc_refs": [ { "kind": "claimed-but-never-ran", "claim": "npm test passes" } ],
  "wall_clock_s": 212, "tool_calls": 19, "retries": 2
}
```

So the sentence you should expect to be able to say after a run is:
*"For task type T, tool A delivers a verified result for $X on average, tool B costs Y× more for Z
points of reliability, and tool C lied about being done in N% of runs — here are the receipts."*

What the harness will **not** give you: a single overall winner (results are per task type by
design), cross-vendor token comparisons (tokenizers differ; dollars are the common unit), or any
number extrapolated beyond the cases that actually ran (coverage is printed on every table).

## Shaping the dataset to YOUR use cases

The 585 seed cases are a starting point, not a canon. The whole design assumes you'll reshape it —
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
