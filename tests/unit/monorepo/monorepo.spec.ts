import { beforeEach, describe, expect, test } from 'vitest';

import { Component, Monorepo, MonorepoConfig } from '@/monorepo';

import { CompleteExample } from '../../fixtures/complete-example.js';

describe('Config - MonorepoConfig', () => {
  let repo: Monorepo;
  let config: MonorepoConfig;

  beforeEach(async () => {
    config = new MonorepoConfig(CompleteExample);
    repo = new Monorepo(config);

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
        const repo = new Monorepo(config);
        await repo.init();

        // The original config has a template
        // eslint-disable-next-line no-template-curly-in-string
        expect(config.env.DOCKER_TAG).to.equal('${env:DOCKER_TAG:-latest}');

        // The env has been extended with expanded vars
        expect(process.env.DOCKER_TAG).to.equal('latest');
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
      expect(repo.rootDir).to.equal('/tmp/simple');
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
      expect(production.rootDir).to.equal(CompleteExample.project.rootDir);

      // Override per component
      const originalBuild = config.component('frontend').resources?.image
        ?.params as { target: string };
      expect(originalBuild.target).to.equal('development');

      const newBuild = production.component('frontend').resources?.image
        ?.params as { target: string };
      expect(newBuild.target).to.equal('production');
    });
  });
});
