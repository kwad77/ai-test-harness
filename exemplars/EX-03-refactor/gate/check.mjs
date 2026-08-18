import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ws = path.resolve(process.argv[2] || 'workspace');
const here = path.dirname(fileURLToPath(import.meta.url));
const original = JSON.parse(fs.readFileSync(path.join(here, 'original-frozen.json'), 'utf8'));

let revised;
try {
  revised = JSON.parse(fs.readFileSync(path.join(ws, 'structure.json'), 'utf8'));
} catch (e) {
  console.error(`FAIL: cannot parse structure.json: ${e.message}`);
  process.exit(1);
}

// target: every book has a tags array of strings
for (const book of revised.books || []) {
  if (!Array.isArray(book.tags) || !book.tags.every(t => typeof t === 'string')) {
    console.error(`FAIL: book ${book.isbn} lacks a tags array of strings`);
    process.exit(1);
  }
}

// invariant: with tags removed, the structure equals the frozen original exactly
const stripped = JSON.parse(JSON.stringify(revised));
for (const book of stripped.books || []) delete book.tags;
if (JSON.stringify(stripped) !== JSON.stringify(original)) {
  console.error('FAIL: existing fields were altered (structure minus tags != frozen original)');
  process.exit(1);
}
console.log('PASS');
