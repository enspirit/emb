import { describe, expect, test } from 'vitest';

import { ComponentFlavorConfig, ProjectFlavorConfig } from '@/config/schema.js';
import { resolveComponentFlavor, resolveProjectFlavor } from '@/monorepo';

describe('Monorepo / flavor resolver', () => {
  describe('resolveProjectFlavor', () => {
    test('returns the flavor as-is when it has no parent', () => {
      const flavors: Record<string, ProjectFlavorConfig> = {
        production: {
          patches: [{ op: 'replace', path: '/env/NODE_ENV', value: 'prod' }],
        },
      };

      const resolved = resolveProjectFlavor(flavors, 'production');

      expect(resolved.patches).toHaveLength(1);
      expect(resolved.patches?.[0]).toMatchObject({
        op: 'replace',
        path: '/env/NODE_ENV',
        value: 'prod',
      });
    });

    test('concatenates parent patches before child patches', () => {
      const flavors: Record<string, ProjectFlavorConfig> = {
        production: {
          patches: [
            { op: 'replace', path: '/env/NODE_ENV', value: 'production' },
            { op: 'replace', path: '/env/LOG_LEVEL', value: 'warn' },
          ],
        },
        test: {
          extends: 'production',
          patches: [{ op: 'replace', path: '/env/NODE_ENV', value: 'test' }],
        },
      };

      const resolved = resolveProjectFlavor(flavors, 'test');

      expect(resolved.patches).toHaveLength(3);
      expect(resolved.patches?.[0]).toMatchObject({
        path: '/env/NODE_ENV',
        value: 'production',
      });
      expect(resolved.patches?.[1]).toMatchObject({
        path: '/env/LOG_LEVEL',
        value: 'warn',
      });
      expect(resolved.patches?.[2]).toMatchObject({
        path: '/env/NODE_ENV',
        value: 'test',
      });
    });

    test('supports multi-level inheritance chains', () => {
      const flavors: Record<string, ProjectFlavorConfig> = {
        base: {
          patches: [{ op: 'replace', path: '/a', value: 1 }],
        },
        middle: {
          extends: 'base',
          patches: [{ op: 'replace', path: '/b', value: 2 }],
        },
        leaf: {
          extends: 'middle',
          patches: [{ op: 'replace', path: '/c', value: 3 }],
        },
      };

      const resolved = resolveProjectFlavor(flavors, 'leaf');

      expect(
        resolved.patches?.map((p) => ('value' in p ? p.value : null)),
      ).toEqual([1, 2, 3]);
    });

    test('deep-merges defaults with child winning', () => {
      const flavors: Record<string, ProjectFlavorConfig> = {
        production: {
          defaults: {
            rebuildPolicy: {
              'docker/image': { strategy: 'auto' },
            },
          },
        },
        test: {
          extends: 'production',
          defaults: {
            rebuildPolicy: {
              'docker/image': {
                strategy: 'watch-paths',
                paths: ['Dockerfile'],
              },
            },
          },
        },
      };

      const resolved = resolveProjectFlavor(flavors, 'test');

      expect(resolved.defaults?.rebuildPolicy?.['docker/image']).toMatchObject({
        strategy: 'watch-paths',
        paths: ['Dockerfile'],
      });
    });

    test('inherits defaults when child does not set them', () => {
      const flavors: Record<string, ProjectFlavorConfig> = {
        production: {
          defaults: {
            rebuildPolicy: {
              'docker/image': { strategy: 'always' },
            },
          },
        },
        test: { extends: 'production' },
      };

      const resolved = resolveProjectFlavor(flavors, 'test');

      expect(resolved.defaults?.rebuildPolicy?.['docker/image']).toMatchObject({
        strategy: 'always',
      });
    });

    test('throws when the flavor is unknown', () => {
      expect(() => resolveProjectFlavor({}, 'ghost')).toThrow(/Unknown flavor/);
    });

    test('throws when a parent flavor is unknown', () => {
      const flavors: Record<string, ProjectFlavorConfig> = {
        test: { extends: 'ghost', patches: [] },
      };

      expect(() => resolveProjectFlavor(flavors, 'test')).toThrow(
        /Unknown parent flavor/,
      );
    });

    test('throws on a direct cycle', () => {
      const flavors: Record<string, ProjectFlavorConfig> = {
        a: { extends: 'a' },
      };

      expect(() => resolveProjectFlavor(flavors, 'a')).toThrow(/Circular/);
    });

    test('throws on an indirect cycle', () => {
      const flavors: Record<string, ProjectFlavorConfig> = {
        a: { extends: 'b' },
        b: { extends: 'c' },
        c: { extends: 'a' },
      };

      expect(() => resolveProjectFlavor(flavors, 'a')).toThrow(/Circular/);
    });
  });

  describe('resolveComponentFlavor', () => {
    test('concatenates parent patches before child patches', () => {
      const flavors: Record<string, ComponentFlavorConfig> = {
        production: {
          patches: [{ op: 'replace', path: '/rootDir', value: 'prod' }],
        },
        test: {
          extends: 'production',
          patches: [{ op: 'replace', path: '/description', value: 'test' }],
        },
      };

      const resolved = resolveComponentFlavor(flavors, 'test');

      expect(resolved.patches).toHaveLength(2);
      expect(resolved.patches?.[0]).toMatchObject({ path: '/rootDir' });
      expect(resolved.patches?.[1]).toMatchObject({ path: '/description' });
    });

    test('throws when a parent component flavor is unknown', () => {
      const flavors: Record<string, ComponentFlavorConfig> = {
        test: { extends: 'ghost' },
      };

      expect(() => resolveComponentFlavor(flavors, 'test')).toThrow(
        /Unknown parent component flavor/,
      );
    });
  });
});
