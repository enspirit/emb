import { describe, expect, test, vi } from 'vitest';

import { enableRawMode } from '../../../src/utils/streams.js';

describe('Utils / streams', () => {
  describe('enableRawMode()', () => {
    test('it enables raw mode on TTY streams', () => {
      const mockStdin = {
        isTTY: true,
        isRaw: false,
        setRawMode: vi.fn(),
        resume: vi.fn(),
        pause: vi.fn(),
      } as unknown as NodeJS.ReadStream;

      const restore = enableRawMode(mockStdin);

      expect(mockStdin.setRawMode).toHaveBeenCalledWith(true);
      expect(mockStdin.resume).toHaveBeenCalled();
      expect(typeof restore).toBe('function');
    });

    test('it returns a restore function that resets raw mode', () => {
      const mockStdin = {
        isTTY: true,
        isRaw: false,
        setRawMode: vi.fn(),
        resume: vi.fn(),
        pause: vi.fn(),
      } as unknown as NodeJS.ReadStream;

      const restore = enableRawMode(mockStdin);
      restore();

      // Should be called twice: once to enable, once to restore
      expect(mockStdin.setRawMode).toHaveBeenCalledTimes(2);
      expect(mockStdin.setRawMode).toHaveBeenLastCalledWith(false);
      expect(mockStdin.pause).toHaveBeenCalled();
    });

    test('it preserves original raw mode state when restoring', () => {
      const mockStdin = {
        isTTY: true,
        isRaw: true, // was already raw
        setRawMode: vi.fn(),
        resume: vi.fn(),
        pause: vi.fn(),
      } as unknown as NodeJS.ReadStream;

      const restore = enableRawMode(mockStdin);
      restore();

      // Should restore to true (original state)
      expect(mockStdin.setRawMode).toHaveBeenLastCalledWith(true);
      // Should not pause since it was already raw
      expect(mockStdin.pause).not.toHaveBeenCalled();
    });

    test('it does nothing for non-TTY streams', () => {
      const mockStdin = {
        isTTY: false,
        isRaw: false,
        setRawMode: vi.fn(),
        resume: vi.fn(),
        pause: vi.fn(),
      } as unknown as NodeJS.ReadStream;

      const restore = enableRawMode(mockStdin);

      expect(mockStdin.setRawMode).not.toHaveBeenCalled();
      expect(mockStdin.resume).not.toHaveBeenCalled();

      // Restore should also do nothing
      restore();
      expect(mockStdin.setRawMode).not.toHaveBeenCalled();
    });

    test('it handles streams without setRawMode method', () => {
      const mockStdin = {
        isTTY: true,
        isRaw: false,
        setRawMode: undefined,
        resume: vi.fn(),
        pause: vi.fn(),
      } as unknown as NodeJS.ReadStream;

      // Should not throw
      expect(() => enableRawMode(mockStdin)).not.toThrow();
    });
  });
});
