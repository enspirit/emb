import { EmbContext, getContext, setContext } from '@';
import { describe, expect, test } from 'vitest';

describe('Context', () => {
  describe('setContext()', () => {
    test('it stores the context and returns it', () => {
      const mockContext = {
        docker: {},
        kubernetes: {},
        monorepo: {},
        compose: {},
      } as unknown as EmbContext;

      const result = setContext(mockContext);

      expect(result).toBe(mockContext);
    });
  });

  describe('getContext()', () => {
    test('it returns the stored context', () => {
      const mockContext = {
        docker: {},
        kubernetes: {},
        monorepo: {},
        compose: {},
      } as unknown as EmbContext;

      setContext(mockContext);
      const result = getContext();

      expect(result).toBe(mockContext);
    });

    test('it returns the most recently set context', () => {
      const context1 = { id: 1 } as unknown as EmbContext;
      const context2 = { id: 2 } as unknown as EmbContext;

      setContext(context1);
      setContext(context2);
      const result = getContext();

      expect(result).toBe(context2);
    });
  });
});
