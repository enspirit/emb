import { CircularDependencyError, EMBCollection, findRunGraph } from '@';
import { beforeEach, describe, expect, test } from 'vitest';

import { simpleCollection, SimpleItem } from './utils.js';

describe('Utils / findRunGraph', () => {
  let coll: EMBCollection<SimpleItem, 'id', 'deps'>;

  beforeEach(() => {
    coll = simpleCollection([
      { id: 'frontend:image', name: 'image', deps: ['base:image'] },
      { id: 'frontend:test', name: 'test' },
      { id: 'mobile:image', name: 'image', deps: ['base:image'] },
      { id: 'mobile:test', name: 'test' },
      { id: 'api:image', name: 'image' },
      { id: 'api:test', name: 'test' },
      { id: 'simple:image', name: 'image' },
      { id: 'global:ps', name: 'ps' },
      { id: 'global:up', name: 'up', deps: ['ps'] },
      { id: 'base:image', name: 'base' },
    ])!;
  });

  const idsOf = (nodes: SimpleItem[]): string[] => nodes.map((n) => n.id);

  test('returns the predecessor closure, topologically ordered, with direct-dep edges', () => {
    const { nodes, dependencies } = findRunGraph(['mobile:image'], coll);

    expect(idsOf(nodes)).toEqual(['base:image', 'mobile:image']);
    expect(dependencies.get('mobile:image')).toEqual(['base:image']);
    expect(dependencies.get('base:image')).toEqual([]);
  });

  test('includes a shared dependency once, with an edge to each dependent', () => {
    const { nodes, dependencies } = findRunGraph(
      ['mobile:image', 'frontend:image'],
      coll,
    );

    expect(idsOf(nodes).sort()).toEqual([
      'base:image',
      'frontend:image',
      'mobile:image',
    ]);
    // the shared dependency is ordered first
    expect(idsOf(nodes)[0]).toBe('base:image');
    expect(dependencies.get('mobile:image')).toEqual(['base:image']);
    expect(dependencies.get('frontend:image')).toEqual(['base:image']);
    expect(dependencies.get('base:image')).toEqual([]);
  });

  test('a node with no dependencies maps to an empty list', () => {
    const { nodes, dependencies } = findRunGraph(['api:image'], coll);

    expect(idsOf(nodes)).toEqual(['api:image']);
    expect(dependencies.get('api:image')).toEqual([]);
  });

  test('dependency edges are DIRECT only, not transitive', () => {
    const chain = simpleCollection([
      { id: 'x:c', name: 'c' },
      { id: 'x:b', name: 'b', deps: ['x:c'] },
      { id: 'x:a', name: 'a', deps: ['x:b'] },
    ])!;

    const { nodes, dependencies } = findRunGraph(['x:a'], chain);

    expect(idsOf(nodes)).toEqual(['x:c', 'x:b', 'x:a']);
    expect(dependencies.get('x:a')).toEqual(['x:b']); // not ['x:b', 'x:c']
    expect(dependencies.get('x:b')).toEqual(['x:c']);
    expect(dependencies.get('x:c')).toEqual([]);
  });

  test('resolves a selection by name and follows its deps', () => {
    const { nodes, dependencies } = findRunGraph(['up'], coll);

    expect(idsOf(nodes)).toEqual(['global:ps', 'global:up']);
    expect(dependencies.get('global:up')).toEqual(['global:ps']);
  });

  test('throws on an ambiguous selection by default', () => {
    expect(() => findRunGraph(['image'], coll)).toThrow(/Ambiguous reference/);
  });

  test('expands all matches with onAmbiguous = runAll', () => {
    const { nodes } = findRunGraph(['image'], coll, { onAmbiguous: 'runAll' });

    expect(idsOf(nodes).sort()).toEqual([
      'api:image',
      'base:image',
      'frontend:image',
      'mobile:image',
      'simple:image',
    ]);
    expect(idsOf(nodes)[0]).toBe('base:image'); // shared dep first
  });

  test('throws on circular dependencies', () => {
    const withCircular = simpleCollection([
      { id: 'circular:shared', name: 'image', deps: ['circular:base'] },
      { id: 'circular:base', name: 'image', deps: ['circular:image'] },
      { id: 'circular:image', name: 'image', deps: ['circular:shared'] },
    ])!;

    expect(() => findRunGraph([], withCircular)).toThrow(
      CircularDependencyError,
    );
  });
});
