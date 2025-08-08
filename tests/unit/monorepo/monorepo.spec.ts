import { beforeEach, describe, expect, test } from 'vitest';

import { Component, Monorepo, MonorepoConfig } from '@/monorepo';

import { CompleteExample } from '../../fixtures/complete-example.js';

describe('Config - MonorepoConfig', () => {
  let repo: Monorepo;
  let config: MonorepoConfig;

  beforeEach(() => {
    config = new MonorepoConfig(CompleteExample);
    repo = new Monorepo(config);
  });

  describe('.flavors', () => {
    test('expses the list of flavors available', () => {
      expect(repo.flavors).to.deep.equal(['development', 'production']);
    });
  });

  describe('.components', () => {
    test('exposes the components', () => {
      expect(repo.components).to.have.length(4);

      repo.components.forEach((cmp) =>
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

  describe('.vars', () => {
    test('exposes the unepanded configured vars', () => {
      expect(repo.vars).to.deep.equal(config.vars);

      // eslint-disable-next-line no-template-curly-in-string
      expect(repo.vars.dockerTag).to.equal('${env:DOCKER_TAG:-latest}');
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
    test('complains about unknown flavor', async () => {
      await expect(() => repo.withFlavor('unknown')).rejects.toThrowError(
        /Unknown flavor: unknown/,
      );
    });

    test('returns a new repo', async () => {
      const flavoredRepo = await repo.withFlavor('production');
      expect(flavoredRepo).to.not.equal(repo);
      expect(flavoredRepo).to.be.an.instanceof(Monorepo);
    });
  });
});
