import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { timeAgo } from '../../../src/utils/time.js';

describe('Utils / time', () => {
  describe('timeAgo()', () => {
    beforeEach(() => {
      // Mock Date.now() to a fixed time for consistent tests
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-14T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('it returns empty string for null', () => {
      expect(timeAgo(null)).toBe('');
    });

    test('it returns empty string for undefined', () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      expect(timeAgo(undefined)).toBe('');
    });

    test('it returns seconds for recent times', () => {
      const date = new Date('2026-01-14T11:59:30.000Z'); // 30 seconds ago
      expect(timeAgo(date)).toBe('30s');
    });

    test('it returns minutes and seconds', () => {
      const date = new Date('2026-01-14T11:57:30.000Z'); // 2 min 30 sec ago
      expect(timeAgo(date)).toBe('2m30s');
    });

    test('it returns hours and minutes', () => {
      const date = new Date('2026-01-14T09:30:00.000Z'); // 2 hours 30 min ago
      expect(timeAgo(date)).toBe('2h30m');
    });

    test('it returns days and hours', () => {
      const date = new Date('2026-01-12T09:00:00.000Z'); // 2 days 3 hours ago
      expect(timeAgo(date)).toBe('2d3h');
    });

    test('it returns weeks and days', () => {
      const date = new Date('2025-12-31T12:00:00.000Z'); // 2 weeks ago
      expect(timeAgo(date)).toBe('2w');
    });

    test('it returns months and days', () => {
      const date = new Date('2025-11-14T12:00:00.000Z'); // ~2 months ago
      expect(timeAgo(date)).toBe('2mo1d');
    });

    test('it returns years and days', () => {
      const date = new Date('2024-01-14T12:00:00.000Z'); // 2 years ago
      expect(timeAgo(date)).toBe('2y1d');
    });

    test('it accepts DateTime from luxon', () => {
      const date = DateTime.fromISO('2026-01-14T11:59:30.000Z');
      expect(timeAgo(date)).toBe('30s');
    });

    test('it returns only two units maximum', () => {
      // 1 year, 2 months, 3 days... should only show 1y2mo
      const date = new Date('2024-11-10T12:00:00.000Z');
      const result = timeAgo(date);
      const parts = result.match(/\d+[a-z]+/g) || [];
      expect(parts.length).toBeLessThanOrEqual(2);
    });

    test('it handles future dates as 0', () => {
      const date = new Date('2026-01-15T12:00:00.000Z'); // tomorrow
      expect(timeAgo(date)).toBe('');
    });
  });
});
