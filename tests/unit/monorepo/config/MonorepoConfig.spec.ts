import { cwd } from 'node:process';
import { beforeEach, describe, expect, test } from 'vitest';

import { MonorepoConfig } from '@/monorepo';

import { CompleteExample } from '../../../fixtures/complete-example.js';

describe('Config - MonorepoConfig', () => {
  let config: MonorepoConfig;

  beforeEach(() => {
    config = new MonorepoConfig(CompleteExample);
  });

  test('it exposes its config', () => {
    const config = new MonorepoConfig({
      components: [
        {
          name: 'frontend',
          docker: {
            context: 'frontend',
          },
        },
        {
          name: 'backend',
          docker: {
            buildArgs: {
              API_KEY: 'secret',
            },
            context: 'backend',
            target: 'production',
          },
        },
      ],
      env: {
        DOCKER_TAG: 'latest',
      },
      flavors: [
        {
          components: [
            {
              name: 'frontend',
              docker: {
                target: 'production',
                buildArgs: {
                  API_KEY: 'production secret',
                },
              },
            },
          ],
          name: 'production',
        },
      ],
      project: {
        name: 'test',
        rootDir: cwd(),
      },
      tasks: [
        {
          name: 'status',
          script: 'git status',
        },
      ],
    });

    expect(config.project.name).to.equal('test');
    expect(config.project.rootDir).to.equal(cwd());
    expect(config.env).to.deep.equal({ DOCKER_TAG: 'latest' });
    expect(config.components).toHaveLength(2);

    expect(config.components[0].name).to.equal('frontend');
    expect(config.components[1].name).to.equal('backend');

    expect(config.flavors).to.have.length(1);
    expect(config.flavors[0].name).to.equal('production');

    expect(config.tasks).to.have.length(1);
    expect(config.tasks[0].name).to.equal('status');
    expect(config.tasks[0].script).to.equal('git status');
  });

  describe('#flavor(name)', () => {
    test('throws when flavour unknown', () => {
      expect(() => config.flavor('unknown')).to.throw(/Unknown flavor/);
    });

    test('returns the flavour config', () => {
      expect(config.flavor('production').components).toHaveLength(1);
    });
  });

  describe('#component(name)', () => {
    test('throws when component unknown', () => {
      expect(() => config.component('unknown')).to.throw(/Unknown component/);
    });

    test('returns the component config', () => {
      expect(config.component('frontend').name).to.equal('frontend');
    });
  });

  describe('#with', () => {
    test('deep merges properly', () => {
      const config1 = new MonorepoConfig({
        components: [],
        defaults: {
          docker: {
            labels: {
              'emb/project': 'test',
            },
          },
        },
        project: {
          name: 'test',
          rootDir: '/tmp',
        },
      });

      const config2 = config1.with({
        components: [
          {
            docker: {
              buildArgs: {
                GREETING: 'test',
              },
            },
            name: 'frontend',
            tasks: [
              {
                name: 'test',
                script: 'npm run test',
              },
            ],
          },
        ],
      });

      expect(config2.defaults.docker?.labels).to.include({
        'emb/project': 'test',
      });
    });
  });

  describe('#withFlavor(name)', () => {
    test('throws when flavour unknown', () => {
      expect(() => config.withFlavor('unknown')).to.throw(/Unknown flavor/);
    });

    test('returns a new config', () => {
      // before
      expect(config.currentFlavor).to.equal('default');

      const newConfig = config.withFlavor('production');
      expect(newConfig).to.not.equal(config);
      expect(newConfig).to.be.an.instanceOf(MonorepoConfig);
      expect(newConfig.currentFlavor).to.equal('production');
    });

    test('uses the flavour overrides accordingly', () => {
      const production = config.withFlavor('production');

      // Untouched
      expect(production.project.name).to.equal(CompleteExample.project.name);
      expect(production.project.rootDir).to.equal(
        CompleteExample.project.rootDir,
      );

      // Override per component
      expect(config.component('frontend').docker?.target).to.equal(
        'development',
      );
      expect(production.component('frontend').docker?.target).to.equal(
        'production',
      );

      // Override defaults
      // eslint-disable-next-line no-template-curly-in-string
      expect(config.defaults.docker?.tag).to.equal('${env:DOCKER_TAG}');
      expect(production.defaults.docker?.tag).to.equal('production');

      // Override defaults
      // eslint-disable-next-line no-template-curly-in-string
      expect(config.env.DOCKER_TAG).to.equal('${env:DOCKER_TAG:-latest}');
      expect(production.env.DOCKER_TAG).to.equal('production');
    });
  });
});
