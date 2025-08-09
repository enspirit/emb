import { describe, expect, test } from 'vitest';

import { byName, deepMergeArray } from '@/utils';

describe('Utils / deepMergeArray', () => {
  describe('when not used with identifier function', () => {
    test('it does not remove elements from target', () => {
      expect(deepMergeArray([1], [])).to.deep.eq([1]);
    });

    test('it does merge things', () => {
      expect(deepMergeArray([1], [2, 3])).to.deep.eq([1, 2, 3]);
    });
  });

  describe('when used with identifier function', () => {
    test('it does not remove elements from target', () => {
      expect(deepMergeArray([{ name: 'frontend' }], [], byName)).to.deep.eq([
        { name: 'frontend' },
      ]);
    });

    test('it does work as expected', () => {
      const result = deepMergeArray(
        [{ buildArgs: { foo: 'bar', untouched: true }, name: 'frontend' }],
        [{ buildArgs: { add: 42, foo: 'baz' }, name: 'frontend' }],
        byName,
      );

      expect(result).to.deep.eq([
        {
          buildArgs: { add: 42, foo: 'baz', untouched: true },
          name: 'frontend',
        },
      ]);
    });
  });
});
