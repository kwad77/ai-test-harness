# ai-test-harness

A benchmark harness for measuring **token efficiency of AI coding agents** (Claude Code, Cursor,
Copilot agent mode, Codex CLI, raw API loops) across task types — so AI-tooling POC decisions are
driven by measured **cost per validated outcome**, not demos.

Headline metrics: tokens/cost per *validated* outcome (failed-run spend counts), validation rate,
fake-green rate (claimed success, gate red), and hallucinated-reference rate. Outcomes are 4-way:
verified-delivered / honest-block / honest-fail / fake-green.

## Contents

| Path | What |
|---|---|
| `SPEC.md` | The full harness specification — read this first |
| `cases/teh-v1-seed-cases.json` | 500 frozen seed prompts across 7 task types |
| `exemplars/` | One **fully promoted, runnable** case per task type, with fail/pass proofs |
| `exemplars/run-proofs.mjs` | Conformance kit: verifies gates execute as intended (`node exemplars/run-proofs.mjs`, exit 0 = conformant) |
| `AUTHORING.md` | Playbook for promoting the remaining seed cases |
| `tools/build-seed-cases.mjs` | Provenance: the generator that produced the seed set from its source corpus (runs only in the originating repo) |

## Quickstart

```sh
node exemplars/run-proofs.mjs   # should print 6x ok + 1x judge-required, exit 0
```

Then build in SPEC.md §12 phase order: runner skeleton + `api-loop` adapter first, driven against the
exemplars, before touching the 500-case set.

## Status

Spec + dataset + exemplars are complete; the runner, adapters, and scorer are not yet built.
