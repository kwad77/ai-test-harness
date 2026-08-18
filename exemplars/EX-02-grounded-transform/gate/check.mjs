import fs from 'node:fs';
import path from 'node:path';

const ws = path.resolve(process.argv[2] || 'workspace');
const GOLD = [
  'ana.ortiz@example.com',
  'ben.liu@example.org',
  'carla.mbeki@example.net',
  'dev.patel@example.com',
  'eiko.tanaka@example.org',
];

let raw;
try {
  raw = fs.readFileSync(path.join(ws, 'emails.txt'), 'utf8');
} catch {
  console.error('FAIL: emails.txt not found in workspace');
  process.exit(1);
}
const got = raw.split('\n').map(l => l.trim()).filter(Boolean);
const want = [...GOLD].sort();
if (JSON.stringify(got) !== JSON.stringify(want)) {
  console.error(`FAIL: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
  process.exit(1);
}
console.log('PASS');
