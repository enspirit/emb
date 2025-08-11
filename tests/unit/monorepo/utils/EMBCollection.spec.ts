/* eslint-disable max-nested-callbacks */
import { AmbiguousReferenceError, EMBCollection, ItemCollisionsError } from '@';
import { describe, expect, it } from 'vitest';

import { simpleCollection } from './utils.js';

describe('Utils / EMBCollection', () => {
  describe('its constructor', () => {
    it('works', () => {
      const coll = simpleCollection([
        { id: '1', name: 'one' },
        { id: '2', name: 'two' },
        { id: '3', name: 'three' },
      ]);

      expect(coll).toBeInstanceOf(EMBCollection);
    });

    it('ensures there are no ID conflicts in items', () => {
      return simpleCollection(
        [
          { id: '1', name: 'foo' },
          { id: '2', name: 'bar' },
          { id: '1', name: 'baz' },
        ],
        (error) => {
          expect(error).toBeInstanceOf(ItemCollisionsError);

          const itemError = error as ItemCollisionsError;
          expect(itemError.message).toMatch(/Collision between items/);
          expect(itemError.collisions).toHaveLength(1);
          const collision = itemError.collisions[0];
          expect(collision).toMatch(/id `1` used by `foo` and `baz`/);
        },
      );
    });

    it('ensures there are no ID<>name conflicts in items', () => {
      return simpleCollection(
        [
          { id: 'test', name: 'something' },
          { id: 'frontend', name: 'test' },
          { id: 'pre', name: 'fixtest' },
        ],
        (error) => {
          expect(error).toBeInstanceOf(ItemCollisionsError);

          const itemError = error as ItemCollisionsError;
          expect(itemError.message).toMatch(/Collision between items/);
          expect(itemError.collisions).toHaveLength(1);
          const collision = itemError.collisions[0];
          expect(collision).toMatch(
            /value `test` is a name of `test` and also an id of `something`/,
          );
        },
      );
    });

    describe('#matches(ref)', () => {
      const items = [
        { id: 'global:ps', name: 'ps' },
        { id: 'frontend:test', name: 'test' },
        { id: 'api:test', name: 'test' },
        { id: 'bus:test', name: 'test' },
        { id: 'api:restart', name: 'restart' },
      ];

      const coll = simpleCollection(items);

      it('matches on id', () => {
        expect(coll?.matches('global:ps')).to.equal(items[0]);
        expect(coll?.matches('frontend:test')).to.equal(items[1]);
      });

      it('complains when not finding the item', () => {
        expect(() => coll?.matches('unknown')).toThrow(
          /Unknown reference `unknown`/,
        );
      });

      it('complains on ambiguity', () => {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const fn = () => coll?.matches('test');

        expect(fn).toThrow(/Ambiguous reference `test` matches multiple names/);

        try {
          fn();
        } catch (error) {
          expect((error as AmbiguousReferenceError).ref).to.equal('test');
          expect((error as AmbiguousReferenceError).matches).to.contain(
            'frontend:test',
          );
          expect((error as AmbiguousReferenceError).matches).to.contain(
            'api:test',
          );
          expect((error as AmbiguousReferenceError).matches).to.contain(
            'bus:test',
          );
        }
      });

      it('allows for ambiguity if specified', () => {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const fn = () => coll?.matches('test', { multiple: true });

        expect(fn).not.toThrow(
          /Ambiguous reference `test` matches multiple names/,
        );

        const matches = fn();
        expect(matches).to.contain(items[1]);
        expect(matches).to.contain(items[2]);
        expect(matches).to.contain(items[3]);
      });
    });
  });
});
