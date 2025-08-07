import { describe, expect, test, vi } from 'vitest';
import { deepMergeArray } from '../../../src/utils/index.js';

describe('Utils / deepMergeArray', () => {

  describe('when not used with identifier function', () => {
    test('it does not remove elements from target', () => {
      expect(deepMergeArray([1], [])).to.deep.eq([1])
    })

    test('it does merge things', () => {
      expect(deepMergeArray([1], [2, 3])).to.deep.eq([1, 2, 3])
    })
  })

  describe('when used with identifier function', () => {

    const byName = <T extends { name: string }>(item: T) => item.name

    test('it does not remove elements from target', () => {
      expect(deepMergeArray(
        [{ name: 'frontend' }],
        [],
        byName,
      )).to.deep.eq(
        [{ name: 'frontend' }]
      )
    })

    test('it does work as expected', () => {
      const result = deepMergeArray(
        [{ name: 'frontend', buildArgs: { foo: 'bar', untouched: true } }],
        [{ name: 'frontend', buildArgs: { foo: 'baz', add: 42 }}],
        byName,
      );

      expect(result).to.deep.eq(
        [{ name: 'frontend', buildArgs: { foo: 'baz', add: 42, untouched: true }}]
      )
    })
  })


});
