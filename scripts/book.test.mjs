import assert from 'node:assert/strict';
import test from 'node:test';
import { spreadFor, spreadLabel, stepFrom } from '../src/book.js';

function readingOrder(total, singlePage, direction) {
  let page = direction > 0 ? 1 : total;
  const groups = [];
  while (true) {
    const spread = spreadFor(page, total, singlePage);
    groups.push(spread);
    const target = stepFrom(spread, direction, total);
    if (target === page) return groups;
    page = target;
  }
}

test('desktop opens centered covers and turns through paired interior pages', () => {
  assert.deepEqual(readingOrder(8, false, 1), [[1], [2, 3], [4, 5], [6, 7], [8]]);
  assert.deepEqual(readingOrder(8, false, -1), [[8], [6, 7], [4, 5], [2, 3], [1]]);
});

test('an odd interior page remains accessible before the last cover', () => {
  assert.deepEqual(readingOrder(7, false, 1), [[1], [2, 3], [4, 5], [6], [7]]);
  assert.deepEqual(readingOrder(7, false, -1), [[7], [6], [4, 5], [2, 3], [1]]);
  assert.deepEqual(spreadFor(3, 7), [2, 3]);
  assert.equal(spreadLabel(spreadFor(149, 150)), '148–149');
});

test('short books and narrow viewports keep each leaf accessible', () => {
  assert.deepEqual(readingOrder(1, false, 1), [[1]]);
  assert.deepEqual(readingOrder(2, false, 1), [[1], [2]]);
  assert.deepEqual(readingOrder(3, false, 1), [[1], [2], [3]]);
  assert.deepEqual(readingOrder(5, true, 1), [[1], [2], [3], [4], [5]]);
  assert.deepEqual(readingOrder(5, true, -1), [[5], [4], [3], [2], [1]]);
});
