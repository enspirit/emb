import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Component, Monorepo } from '@/monorepo';

describe('Monorepo / Component', () => {
  let tempDir: string;
  let monorepo: Monorepo;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embComponentTest'));
    monorepo = new Monorepo(
      {
        project: { name: 'test-project' },
        plugins: [],
        components: {},
      },
      tempDir,
    );
    await monorepo.init();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    test('it initializes with name and config', () => {
      const component = new Component(
        'api',
        {
          rootDir: 'services/api',
        },
        monorepo,
      );

      expect(component.name).toBe('api');
      expect(component._rootDir).toBe('services/api');
    });

    test('it initializes tasks with component prefix', () => {
      const component = new Component(
        'api',
        {
          tasks: {
            build: { script: 'npm run build' },
            test: { script: 'npm test' },
          },
        },
        monorepo,
      );

      expect(Object.keys(component.tasks)).toHaveLength(2);
      expect(component.tasks.build.id).toBe('api:build');
      expect(component.tasks.build.name).toBe('build');
      expect(component.tasks.test.id).toBe('api:test');
    });

    test('it initializes resources with component prefix', () => {
      const component = new Component(
        'api',
        {
          resources: {
            image: {
              type: 'docker/image',
              params: { context: '.' },
            },
          },
        },
        monorepo,
      );

      expect(Object.keys(component.resources)).toHaveLength(1);
      expect(component.resources.image.id).toBe('api:image');
      expect(component.resources.image.name).toBe('image');
      expect(component.resources.image.component).toBe('api');
    });

    test('it initializes flavors with component prefix', () => {
      const component = new Component(
        'api',
        {
          flavors: {
            production: {
              patches: [{ op: 'replace', path: '/rootDir', value: 'prod' }],
            },
          },
        },
        monorepo,
      );

      expect(Object.keys(component.flavors)).toHaveLength(1);
      expect(component.flavors.production.id).toBe('api:production');
    });
  });

  describe('#rootDir', () => {
    test('it returns custom rootDir when set', () => {
      const component = new Component(
        'api',
        { rootDir: 'services/api' },
        monorepo,
      );

      expect(component.rootDir).toBe('services/api');
    });

    test('it returns component name when rootDir not set', () => {
      const component = new Component('api', {}, monorepo);

      expect(component.rootDir).toBe('api');
    });
  });

  describe('#flavor()', () => {
    test('it returns flavor config when it exists', () => {
      const component = new Component(
        'api',
        {
          flavors: {
            production: {
              patches: [{ op: 'replace', path: '/rootDir', value: 'prod' }],
            },
          },
        },
        monorepo,
      );

      const flavor = component.flavor('production');

      expect(flavor).toBeDefined();
      expect(flavor.patches).toHaveLength(1);
    });

    test('it throws when flavor does not exist and mustExist is true', () => {
      const component = new Component('api', {}, monorepo);

      expect(() => component.flavor('unknown')).toThrow(/Unknown flavor/);
    });

    test('it returns undefined when flavor does not exist and mustExist is false', () => {
      const component = new Component('api', {}, monorepo);

      const flavor = component.flavor('unknown', false);

      expect(flavor).toBeUndefined();
    });
  });

  describe('#cloneWith()', () => {
    test('it creates a new component with merged config', () => {
      const component = new Component(
        'api',
        {
          rootDir: 'api',
          tasks: { build: { script: 'npm build' } },
        },
        monorepo,
      );

      const cloned = component.cloneWith({ rootDir: 'new-api' });

      expect(cloned).toBeInstanceOf(Component);
      expect((cloned as Component).rootDir).toBe('new-api');
      expect((cloned as Component).tasks.build).toBeDefined();
    });
  });

  describe('#toJSON()', () => {
    test('it returns a deep clone of the config', () => {
      const originalConfig = {
        rootDir: 'api',
        tasks: { build: { script: 'npm build' } },
      };
      const component = new Component('api', originalConfig, monorepo);

      const json = component.toJSON();

      expect(json).toEqual(originalConfig);
      // Verify it's a clone, not the same reference
      expect(json).not.toBe(originalConfig);
    });
  });

  describe('#withFlavor()', () => {
    test('it applies flavor patches and returns new component', () => {
      const component = new Component(
        'api',
        {
          rootDir: 'api',
          flavors: {
            production: {
              patches: [{ op: 'replace', path: '/rootDir', value: 'api-prod' }],
            },
          },
        },
        monorepo,
      );

      const flavored = component.withFlavor('production');

      expect(flavored).toBeInstanceOf(Component);
      expect(flavored.rootDir).toBe('api-prod');
      // Original should be unchanged
      expect(component.rootDir).toBe('api');
    });

    test('it throws when flavor has invalid patches', () => {
      const component = new Component(
        'api',
        {
          rootDir: 'api',
          flavors: {
            broken: {
              patches: [
                { op: 'replace', path: '/nonexistent/deep/path', value: 'x' },
              ],
            },
          },
        },
        monorepo,
      );

      expect(() => component.withFlavor('broken')).toThrow();
    });
  });

  describe('#join()', () => {
    test('it joins path with monorepo root and component rootDir', () => {
      const component = new Component(
        'api',
        { rootDir: 'services/api' },
        monorepo,
      );

      const result = component.join('src/index.ts');

      expect(result).toBe(join(tempDir, 'services/api', 'src/index.ts'));
    });
  });

  describe('#relative()', () => {
    test('it returns path relative to component rootDir', () => {
      const component = new Component(
        'api',
        { rootDir: 'services/api' },
        monorepo,
      );

      const result = component.relative('src/index.ts');

      expect(result).toBe(join('services/api', 'src/index.ts'));
    });
  });
});
