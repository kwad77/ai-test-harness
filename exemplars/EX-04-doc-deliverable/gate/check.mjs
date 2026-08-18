import fs from 'node:fs';
import path from 'node:path';

const ws = path.resolve(process.argv[2] || 'workspace');
let text;
try {
  text = fs.readFileSync(path.join(ws, 'schedule.md'), 'utf8');
} catch {
  console.error('FAIL: schedule.md not found in workspace');
  process.exit(1);
}
for (let d = 1; d <= 30; d++) {
  // entry must exist and have non-empty content on its line or the following line
  const re = new RegExp(`Day ${d}\\b[:.\\-\\s]*([^\\n]*)(\\n(?![#*\\-]*\\s*Day \\d)([^\\n]+))?`);
  const m = text.match(re);
  const content = m ? ((m[1] || '') + (m[3] || '')).trim() : '';
  if (!m || content.length < 3) {
    console.error(`FAIL: no non-empty entry for Day ${d}`);
    process.exit(1);
  }
}
console.log('PASS');
