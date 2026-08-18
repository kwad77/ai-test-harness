# Case authoring playbook

How a seed case (`cases/teh-v1-seed-cases.json`, `status: "todo"`) is promoted to runnable. The
`exemplars/` directory contains one fully-promoted case per v1 task type — **copy their shape; do not
invent new conventions.** Run `node exemplars/run-proofs.mjs` (exit 0) to verify your runner executes
gates exactly as intended before building anything else.

## Layout of a promoted case

```
<case-id>/
  case.json                 # the seed case, promoted (see fields below)
  workspace/                # frozen input state the agent starts from (may be empty)
  gate/check.mjs            # runnable gate (or gate.run may call any command)
  gold/                     # judged types only: gold answer + rubric
  solutions/reference/      # files that, overlaid on workspace/, make the gate pass
  proof/fail.log            # gate run against untouched workspace  -> must fail
  proof/pass.log            # gate run against workspace+reference  -> must pass
```

A case without both proofs is **not admissible**. `run-proofs.mjs` generates and verifies them.

## Conventions (these were the judgment calls; they are now fixed)

1. **Deliverables must be addressable.** Raw prompts rarely name an output location, so promotion
   adds a `prompt_addendum` ("Save it as reverse.js…"). The runner sends prompt + addendum as one
   message; the addendum is recorded so prompt drift is auditable. For `explain`, the agent's final
   message is the deliverable — the runner captures it as `answer.md`.
2. **Gate CLI contract.** `gate.run` is executed from the case directory with the literal token
   `workspace` substituted by the actual workspace path (the runner may run gates against copies).
   Exit 0 = pass, anything else = fail. Gates never read the agent transcript.
3. **Grounded artifacts plant a known answer.** Author the input so the correct output is
   unambiguous, and include at least one decoy that a sloppy read would wrongly include
   (see EX-02: a non-user email in metadata, a nested contact block).
4. **Refactor/bugfix gates enforce the invariant, not just the target.** Keep a frozen copy of the
   original inside `gate/` and assert nothing else changed (EX-03), or hash the test file and treat
   any modification as `fake-green(gate_tamper)` (EX-07).
5. **Structural gates for documents check the witness, not the quality.** "30-day schedule" → all 30
   labeled, non-empty day entries (EX-04). Quality is the judge's job in full runs.
6. **Judged cases freeze the whole judging surface**: gold answer, rubric (0–3, default template in
   SPEC §5.3), and the judge packet shape (EX-06). The judge never sees the transcript.
7. **Design inputs to make mechanical checks sound.** EX-05's input has no abbreviations or decimal
   points, so a naive sentence-splitter is a correct "exactly two sentences" check. Prefer bending
   the fixture over complicating the checker.

## Per-task-type gate recipes

| task_type | exemplar | gate recipe |
|---|---|---|
| spec-to-code | EX-01 | addendum names file + export; check.mjs imports and asserts behavior table |
| grounded-transform | EX-02 | addendum names output file + format; exact-match vs gold embedded in checker |
| refactor | EX-03 | in-place edit; target assertion + frozen-original invariant |
| doc-deliverable | EX-04 | addendum names file + structure; structural witness loop |
| doc-revision | EX-05 | structural constraint checked mechanically + gold/rubric for judged stage |
| explain | EX-06 | no command gate; gold + rubric + judge packet; tier-1 hallucination check on answer |
| bugfix | EX-07 | planted defect + failing test in workspace; gate = run tests; test-file hash anti-cheat |

Still needing first exemplars: `test-authoring`, `debug-loop`, `migration`, `interactive` (v2).
