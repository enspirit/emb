import {
  AUTO_CONCURRENCY_CAP,
  autoConcurrency,
  resolveBuildConcurrency,
} from '@';
import { cpus } from 'node:os';
import { describe, expect, test } from 'vitest';

describe('Utils / build concurrency', () => {
  describe('autoConcurrency()', () => {
    test('is the CPU count capped at AUTO_CONCURRENCY_CAP, at least 1', () => {
      expect(autoConcurrency()).toBe(
        Math.min(cpus().length, AUTO_CONCURRENCY_CAP),
      );
      expect(autoConcurrency()).toBeGreaterThanOrEqual(1);
      expect(autoConcurrency()).toBeLessThanOrEqual(AUTO_CONCURRENCY_CAP);
    });
  });

  describe('resolveBuildConcurrency()', () => {
    test('defaults to 1 (serial) when neither flag nor config is set', () => {
      expect(resolveBuildConcurrency({})).toBe(1);
    });

    test('uses the config value when no flag is given', () => {
      expect(resolveBuildConcurrency({ configured: 8 })).toBe(8);
    });

    test('the flag wins over the config value', () => {
      expect(resolveBuildConcurrency({ jobs: 2, configured: 8 })).toBe(2);
    });

    test("resolves 'auto' (from flag or config) to autoConcurrency()", () => {
      expect(resolveBuildConcurrency({ jobs: 'auto' })).toBe(autoConcurrency());
      expect(resolveBuildConcurrency({ configured: 'auto' })).toBe(
        autoConcurrency(),
      );
    });

    test('an explicit jobs=1 stays serial', () => {
      expect(resolveBuildConcurrency({ jobs: 1 })).toBe(1);
    });

    test('clamps non-positive values up to 1', () => {
      expect(resolveBuildConcurrency({ jobs: 0 })).toBe(1);
      expect(resolveBuildConcurrency({ jobs: -5 })).toBe(1);
      expect(resolveBuildConcurrency({ configured: 0 })).toBe(1);
    });

    test('floors fractional values', () => {
      expect(resolveBuildConcurrency({ jobs: 3.9 })).toBe(3);
    });
  });
});
