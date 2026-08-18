import { createRequire } from 'node:module';
import path from 'node:path';

const ws = path.resolve(process.argv[2] || 'workspace');
const require = createRequire(import.meta.url);

let reverse;
try {
  ({ reverse } = require(path.join(ws, 'reverse.js')));
} catch (e) {
  console.error(`FAIL: cannot load reverse.js from ${ws}: ${e.message}`);
  process.exit(1);
}
if (typeof reverse !== 'function') {
  console.error('FAIL: reverse is not an exported function');
  process.exit(1);
}
const cases = [['hello', 'olleh'], ['', ''], ['ab cd', 'dc ba'], ['x', 'x']];
for (const [input, want] of cases) {
  const got = reverse(input);
  if (got !== want) {
    console.error(`FAIL: reverse(${JSON.stringify(input)}) = ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    process.exit(1);
  }
}
console.log('PASS');
