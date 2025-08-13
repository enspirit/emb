import {
  CircularDependencyError,
  EMBCollection,
  findRunOrder,
  resolveRefSet,
} from '@';
import { beforeEach, describe, expect, it } from 'vitest';

import { simpleCollection, SimpleItem } from './utils.js';

describe('Utils / graph', () => {
  let coll: EMBCollection<SimpleItem, 'id', 'deps'>;
  let items: Array<SimpleItem>;

  beforeEach(() => {
    items = [
      { id: 'frontend:image', name: 'image', deps: ['base:image'] },
      { id: 'frontend:test', name: 'test' },
      { id: 'mobile:image', name: 'image', deps: ['base:image'] },
      { id: 'mobile:test', name: 'test' },
      { id: 'api:image', name: 'image' },
      { id: 'api:test', name: 'test' },
      { id: 'simple:image', name: 'image' },
      { id: 'global:ps', name: 'ps' },
      { id: 'global:up', name: 'up', deps: ['ps'] },
      { id: 'base:image', name: 'image ' },
    ];
    coll = simpleCollection(items)!;
  });

  describe('#resolveRefSet()', () => {
    it('works as expected with names & policy `runAll`', () => {
      // Multiple matches are returned
      const testMatches = resolveRefSet(coll, 'test', 'runAll');
      expect(testMatches).toHaveLength(3);
      expect(testMatches).toContain('frontend:test');
      expect(testMatches).toContain('api:test');
      expect(testMatches).toContain('mobile:test');

      // Single matches is returned as array
      const psMatches = resolveRefSet(coll, 'ps', 'runAll');
      expect(psMatches).toHaveLength(1);
      expect(psMatches).toContain('global:ps');
    });

    it('works as expected with names & policy `error`', () => {
      expect(() => resolveRefSet(coll, 'test', 'error')).toThrow(
        /Ambiguous reference `test` matches multiple names/,
      );
    });

    it('works as expected with wrong references & policy `error`', () => {
      expect(() => resolveRefSet(coll, 'unknown', 'error')).toThrow(
        /Unknown reference `unknown`/,
      );
    });

    it('works as expected with wrong references & policy `runAll`', () => {
      expect(() => resolveRefSet(coll, 'unknown', 'runAll')).toThrow(
        /Unknown reference `unknown`/,
      );
    });

    it('works as expected with ids & policy `runAll`', () => {
      // Multiple matches are returned
      const testMatches = resolveRefSet(coll, 'frontend:test', 'runAll');
      expect(testMatches).toHaveLength(1);
      expect(testMatches).toContain('frontend:test');

      // Single matches is returned as array
      const psMatches = resolveRefSet(coll, 'global:ps', 'runAll');
      expect(psMatches).toHaveLength(1);
      expect(psMatches).toContain('global:ps');
    });

    it('works as expected with id & policy `error`', () => {
      // Multiple matches are returned
      const testMatches = resolveRefSet(coll, 'frontend:test', 'error');
      expect(testMatches).toHaveLength(1);
      expect(testMatches).toContain('frontend:test');

      // Single matches is returned as array
      const psMatches = resolveRefSet(coll, 'global:ps', 'error');
      expect(psMatches).toHaveLength(1);
      expect(psMatches).toContain('global:ps');
    });

    it('works as expected for single selection by id without deps', () => {
      const psMatches = findRunOrder(['global:ps'], coll);
      expect(psMatches).toHaveLength(1);
      expect(psMatches).toContain(items.find((i) => i.id === 'global:ps'));

      const baseImageMatches = findRunOrder(['base:image'], coll);
      expect(baseImageMatches).toHaveLength(1);
      expect(baseImageMatches).toContain(
        items.find((i) => i.id === 'base:image'),
      );
    });

    it('works as expected for single selection by name without deps', () => {
      const psMatches = findRunOrder(['ps'], coll);
      expect(psMatches).toHaveLength(1);
      expect(psMatches).toContain(items.find((i) => i.id === 'global:ps'));
    });

    it('works as expected for single selection by id with deps', () => {
      const list = findRunOrder(['mobile:image'], coll);
      expect(list).toHaveLength(2);
      expect(list).toContain(items.find((i) => i.id === 'mobile:image'));
      // its dep
      expect(list).toContain(items.find((i) => i.id === 'base:image'));

      expect(list[0].id).toEqual('base:image');
      expect(list[1].id).toEqual('mobile:image');
    });

    it('works as expected for multiple selection with shared deps', () => {
      const list = findRunOrder(['mobile:image', 'frontend:image'], coll);
      expect(list).toHaveLength(3);
      expect(list).toContain(items.find((i) => i.id === 'mobile:image'));
      expect(list).toContain(items.find((i) => i.id === 'frontend:image'));
      // their shared dep...
      expect(list).toContain(items.find((i) => i.id === 'base:image'));
      // ...is first
      expect(list[0].id).toEqual('base:image');
    });

    it('works as expected for single selection by name with deps', () => {
      const list = findRunOrder(['up'], coll);
      expect(list).toHaveLength(2);
      expect(list).toContain(items.find((i) => i.id === 'global:up'));
      // its dep
      expect(list).toContain(items.find((i) => i.id === 'global:ps'));

      expect(list[0].id).toEqual('global:ps');
      expect(list[1].id).toEqual('global:up');
    });

    it('throws when facing ambiguous selection (by default)', () => {
      expect(() => findRunOrder(['image'], coll)).toThrowError(
        /Ambiguous reference/,
      );
    });

    it("throws when facing ambiguous selection (and onAmbiguous='error')", () => {
      expect(() =>
        findRunOrder(['image'], coll, { onAmbiguous: 'error' }),
      ).toThrowError(/Ambiguous reference/);
    });

    it("works as expected for multiple selection with shared deps (with onAmbiguous='runAll')", () => {
      const list = findRunOrder(['image'], coll, { onAmbiguous: 'runAll' });
      expect(list).toHaveLength(5);
      expect(list).toContain(items.find((i) => i.id === 'mobile:image'));
      expect(list).toContain(items.find((i) => i.id === 'frontend:image'));
      expect(list).toContain(items.find((i) => i.id === 'api:image'));
      expect(list).toContain(items.find((i) => i.id === 'simple:image'));
      // their shared dep...
      expect(list).toContain(items.find((i) => i.id === 'base:image'));
      // ...is first
      expect(list[0].id).toEqual('base:image');
    });

    it('works as expected when facing circular dependencies', () => {
      const withCircular = simpleCollection([
        // include any of these ones in the selection would create circular dependencies
        {
          id: 'circular:shared',
          name: 'image',
          deps: ['circular:base'],
        },
        {
          id: 'circular:base',
          name: 'image',
          deps: ['circular:image'],
        },
        {
          id: 'circular:image',
          name: 'image',
          deps: ['circular:shared'],
        },
      ])!;

      const fn = () => findRunOrder([], withCircular);

      expect(fn).toThrow(/Circular dependencies detected/);

      try {
        fn();
      } catch (error) {
        expect((error as CircularDependencyError).deps).toHaveLength(1);
        expect((error as CircularDependencyError).deps[0]).toHaveLength(3);
        expect((error as CircularDependencyError).deps[0]).toContain(
          'circular:image',
        );
        expect((error as CircularDependencyError).deps[0]).toContain(
          'circular:base',
        );
        expect((error as CircularDependencyError).deps[0]).toContain(
          'circular:shared',
        );
      }
    });
  });
});
