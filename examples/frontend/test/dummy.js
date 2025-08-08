const test = require('node:test');
const assert = require('node:assert/strict');

test('Our dummy test suite', (t) => {
  test('works', (t) => {
    assert.strictEqual(1, 1);
  });
})
