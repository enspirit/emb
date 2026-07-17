import { beforeEach, describe, expect, test } from 'vitest';

import { Component, Monorepo, MonorepoConfig } from '@/monorepo';

import { CompleteExample } from '../../fixtures/complete-example.js';

describe('Config - MonorepoConfig', () => {
  let repo: Monorepo;
  let config: MonorepoConfig;

  beforeEach(async () => {
    config = new MonorepoConfig(CompleteExample);
    repo = new Monorepo(config, '/tmp');

    await repo.init();
  });

  describe('.flavors', () => {
    test('expses the list of flavors available', () => {
      expect(Object.keys(repo.flavors)).to.deep.equal([
        'development',
        'production',
      ]);
    });
  });

  describe('.components', () => {
    test('exposes the components', () => {
      expect(Object.entries(repo.components)).to.have.length(4);

      Object.values(repo.components).forEach((cmp) =>
        expect(cmp).to.be.an.instanceof(Component),
      );
    });
  });

  describe('.config', () => {
    test('exposes the raw config', () => {
      expect(repo.config).to.deep.equal(config.toJSON());
    });
  });

  describe('.defaults', () => {
    test('exposes the configured defaults', () => {
      expect(repo.defaults).to.deep.equal(config.defaults);
    });
  });

  describe('process.env', () => {
    describe('after repo initialization', () => {
      test('exposes the expanded env vars', async () => {
        const repo = new Monorepo(config, '/tmp/monorepo');
        await repo.init();

        // The original config has a template
        // eslint-disable-next-line no-template-curly-in-string
        expect(config.env.DOCKER_TAG).to.equal('${env:DOCKER_TAG:-latest}');

        // The env has been extended with expanded vars
        expect(process.env.DOCKER_TAG).to.equal('latest');
      });
    });

    describe('after withFlavor()', () => {
      test('expands flavored env against the original shell env, not the base-flavor install', async () => {
        const originalDockerTag = process.env.DOCKER_TAG;
        delete process.env.DOCKER_TAG;

        try {
          const cfg = structuredClone(CompleteExample);
          cfg.flavors!.production.patches!.push({
            op: 'replace',
            path: '/env/DOCKER_TAG',
            // eslint-disable-next-line no-template-curly-in-string
            value: '${env:DOCKER_TAG:-stable}',
          });

          const repo = new Monorepo(new MonorepoConfig(cfg), '/tmp');
          await repo.init();

          // Base install writes the default-flavor value
          expect(process.env.DOCKER_TAG).to.equal('latest');

          await repo.withFlavor('production');

          // The flavored fallback must win: the base-installed 'latest' must
          // not leak into the flavored expansion.
          expect(process.env.DOCKER_TAG).to.equal('stable');
        } finally {
          if (originalDockerTag === undefined) {
            delete process.env.DOCKER_TAG;
          } else {
            process.env.DOCKER_TAG = originalDockerTag;
          }
        }
      });
    });
  });

  describe('.name', () => {
    test('expses the project name', () => {
      expect(repo.name).to.equal('simple');
    });
  });

  describe('.rootDir', () => {
    test('exposes the proper value', () => {
      // See how the complete-example.ts config points to
      // a subfolder relative to the config file
      expect(repo.rootDir).to.equal('/tmp/subfolder');
    });
  });

  describe('#withFlavor(name)', () => {
    test('throws when flavour unknown', async () => {
      await expect(() => repo.withFlavor('unknown')).rejects.toThrow(
        /Unknown flavor/,
      );
    });

    test('returns a new monorepo', async () => {
      const newRepo = await repo.withFlavor('production');
      expect(newRepo).to.not.equal(repo);
      expect(newRepo).to.be.an.instanceOf(Monorepo);
    });

    test('uses the flavour overrides accordingly', async () => {
      const production = await repo.withFlavor('production');

      // Untouched
      expect(production.name).to.equal(CompleteExample.project.name);
      expect(production.rootDir).to.equal(
        '/tmp/' + CompleteExample.project.rootDir,
      );

      // Override per component
      const originalBuild = config.component('frontend').resources?.image
        ?.params as { target: string };
      expect(originalBuild.target).to.equal('development');

      const newBuild = production.component('frontend').resources?.image
        ?.params as { target: string };
      expect(newBuild.target).to.equal('production');
    });

    test('preserves non-string (numeric) patch values', async () => {
      const cfg = structuredClone(CompleteExample);
      cfg.flavors!.production.patches!.push({
        op: 'add',
        path: '/components/frontend/resources/image/params/port',
        value: 8080,
      });

      const repo = new Monorepo(new MonorepoConfig(cfg), '/tmp');
      await repo.init();

      const production = await repo.withFlavor('production');
      const params = production.component('frontend').resources?.image
        ?.params as { port: number };

      expect(params.port).to.equal(8080);
    });

    test('carries over the configured task renderer', async () => {
      // e.g. `emb up --verbose --flavor production`: the verbose renderer is
      // set on the base repo before flavoring and must survive withFlavor().
      repo.setTaskRenderer('verbose');

      const production = await repo.withFlavor('production');

      expect(production.taskManager().options?.renderer).to.equal('verbose');
    });
  });
});
