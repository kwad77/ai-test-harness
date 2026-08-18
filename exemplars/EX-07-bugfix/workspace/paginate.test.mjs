import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { paginate } = require('./paginate.js');

test('pagination totals', () => {
  const items = Array.from({ length: 10 }, (_, i) => i);
  const pages = paginate(items, 3);
  assert.equal(pages.flat().length, 10, 'every item appears on some page');
  assert.equal(pages.length, 4, '10 items at page size 3 is 4 pages');
  assert.deepEqual(pages[3], [9], 'last partial page holds the remainder');
});

test('exact multiple has no empty trailing page', () => {
  const pages = paginate([1, 2, 3, 4], 2);
  assert.equal(pages.length, 2);
  assert.deepEqual(pages[1], [3, 4]);
});

test('empty input yields no pages', () => {
  assert.deepEqual(paginate([], 5), []);
});
