import { describe, expect, test } from 'vitest';

import { computeAlways } from '../../../../../src/docker/resources/rebuildStrategies/always.js';

describe('Docker / rebuildStrategies / computeAlways', () => {
  test('it returns a result stamped with strategy=always', () => {
    const result = computeAlways();

    expect(result.reason).toBe('strategy=always');
  });

  test('it returns an mtime at or after the call time', () => {
    const before = Date.now();
    const result = computeAlways();
    const after = Date.now();

    expect(result.mtime).toBeGreaterThanOrEqual(before);
    expect(result.mtime).toBeLessThanOrEqual(after);
  });

  test('it returns an mtime strictly greater than any prior sentinel timestamp', () => {
    const oldSentinel = Date.now() - 60_000;

    const result = computeAlways();

    expect(result.mtime).toBeGreaterThan(oldSentinel);
  });

  test('it does not include a watched list', () => {
    const result = computeAlways();

    expect(result.watched).toBeUndefined();
  });
});
