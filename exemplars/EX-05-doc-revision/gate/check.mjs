import fs from 'node:fs';
import path from 'node:path';

const ws = path.resolve(process.argv[2] || 'workspace');
let revised, input;
try {
  revised = fs.readFileSync(path.join(ws, 'revised.txt'), 'utf8').trim();
} catch {
  console.error('FAIL: revised.txt not found in workspace');
  process.exit(1);
}
input = fs.readFileSync(path.join(ws, 'longwinded-paragraph.txt'), 'utf8').trim();

const sentences = revised.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
if (sentences.length !== 2) {
  console.error(`FAIL: expected exactly 2 sentences, found ${sentences.length}`);
  process.exit(1);
}
const words = s => s.split(/\s+/).filter(Boolean).length;
if (words(revised) > words(input) / 3) {
  console.error(`FAIL: revision is not concise (${words(revised)} words vs input ${words(input)}; must be under one third)`);
  process.exit(1);
}
console.log('PASS (structural stage; meaning preservation is judge-scored in full runs)');
