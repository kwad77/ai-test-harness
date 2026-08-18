#!/usr/bin/env node
// Conformance kit: runs every exemplar's gate against (a) the untouched workspace
// (must FAIL) and (b) the workspace overlaid with solutions/reference (must PASS).
// Writes proof/fail.log and proof/pass.log per exemplar and checks the results
// against expected-verdicts.json. Exit 0 only if every proof matches.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const expected = JSON.parse(fs.readFileSync(path.join(root, 'expected-verdicts.json'), 'utf8'));

function runGate(exDir, wsDir) {
  const caseSpec = JSON.parse(fs.readFileSync(path.join(exDir, 'case.json'), 'utf8'));
  const cmd = caseSpec.gate.run.replace(/(^|\s)workspace\b/g, `$1${wsDir}`);
  try {
    const out = execSync(cmd, { cwd: exDir, encoding: 'utf8', stdio: 'pipe', timeout: 120000 });
    return { exit: 0, log: out };
  } catch (e) {
    return { exit: e.status ?? 1, log: `${e.stdout || ''}${e.stderr || ''}` };
  }
}

let bad = 0;
for (const [ex, want] of Object.entries(expected.exemplars)) {
  const exDir = path.join(root, ex);
  const proofDir = path.join(exDir, 'proof');
  fs.mkdirSync(proofDir, { recursive: true });
  if (want.untouched === 'judge-required') {
    fs.writeFileSync(path.join(proofDir, 'NOTE.md'), 'Judged case: no runnable gate; conformance is covered by the judge-packet template and gold rubric.\n');
    console.log(`${ex}: judge-required (no runnable proof)`);
    continue;
  }
  // (a) untouched
  const fail = runGate(exDir, path.join(exDir, 'workspace'));
  fs.writeFileSync(path.join(proofDir, 'fail.log'), `exit=${fail.exit}\n${fail.log}`);
  // (b) reference overlay in a temp copy
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `teh-${ex}-`));
  fs.cpSync(path.join(exDir, 'workspace'), tmp, { recursive: true });
  fs.cpSync(path.join(exDir, 'solutions', 'reference'), tmp, { recursive: true });
  const pass = runGate(exDir, tmp);
  fs.writeFileSync(path.join(proofDir, 'pass.log'), `exit=${pass.exit}\n${pass.log}`);
  fs.rmSync(tmp, { recursive: true, force: true });

  const okFail = (fail.exit !== 0) === (want.untouched === 'fail');
  const okPass = (pass.exit === 0) === (want.reference === 'pass');
  if (!okFail || !okPass) {
    bad++;
    console.error(`${ex}: MISMATCH (untouched exit=${fail.exit}, reference exit=${pass.exit})`);
  } else {
    console.log(`${ex}: ok (untouched fails, reference passes)`);
  }
}
process.exit(bad ? 1 : 0);
