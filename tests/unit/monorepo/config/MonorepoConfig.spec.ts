import { cwd } from 'node:process';
import { beforeEach, describe, expect, it, test } from 'vitest';

import { MonorepoConfig } from '@/monorepo';

import { CompleteExample } from '../../../fixtures/complete-example.js';

describe('Config - MonorepoConfig', () => {
  let config: MonorepoConfig;

  beforeEach(() => {
    config = new MonorepoConfig(CompleteExample);
  });

  it('exposes its config', () => {
    const config = new MonorepoConfig({
      components: {
        frontend: {
          resources: {
            image: {
              type: 'docker/image',
              params: {
                context: 'frontend',
              },
            },
          },
        },
        backend: {
          resources: {
            image: {
              type: 'docker/image',
              params: {
                buildArgs: {
                  API_KEY: 'secret',
                },
                context: 'backend',
                target: 'production',
              },
            },
          },
        },
      },
      env: {
        DOCKER_TAG: 'latest',
      },
      flavors: {
        production: {
          patches: [
            {
              op: 'replace',
              path: '/components/frontend/resources/images/params/target',
              value: 'production',
            },
            {
              op: 'replace',
              path: '/components/frontend/resources/images/params/buildArgs/API_KEY',
              value: 'production secret',
            },
          ],
        },
      },
      project: {
        name: 'test',
        rootDir: cwd(),
      },
      tasks: {
        status: {
          script: 'git status',
        },
      },
    });

    expect(config.project.name).to.equal('test');
    expect(config.project.rootDir).to.equal(cwd());
    expect(config.env).to.deep.equal({ DOCKER_TAG: 'latest' });

    expect(Object.keys(config.components)).toHaveLength(2);
    expect(Object.keys(config.components)).toEqual(['frontend', 'backend']);

    expect(Object.keys(config.flavors)).to.have.length(1);
    expect(Object.keys(config.flavors)).to.deep.equal(['production']);

    expect(Object.keys(config.tasks)).to.have.length(1);
    expect(Object.keys(config.tasks)).to.deep.equal(['status']);
    expect(config.tasks.status.script).to.equal('git status');
  });

  describe('#flavor(name)', () => {
    test('throws when flavour unknown', () => {
      expect(() => config.flavor('unknown')).to.throw(/Unknown flavor/);
    });

    test('returns the flavour config', () => {
      const flavor = config.flavor('production');
      expect(Object.keys(flavor.patches || [])).toHaveLength(1);
    });
  });

  describe('#component(name)', () => {
    test('throws when component unknown', () => {
      expect(() => config.component('unknown')).to.throw(/Unknown component/);
    });

    test('returns the component config', () => {
      expect(config.component('frontend')).to.deep.equal(
        CompleteExample.components?.frontend,
      );
    });
  });

  describe('#with', () => {
    test('deep merges properly', () => {
      const config1 = new MonorepoConfig({
        components: {},
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
        components: {
          frontend: {
            resources: {
              image: {
                type: 'docker/image',
                params: {
                  buildArgs: {
                    GREETING: 'test',
                  },
                },
              },
            },
            tasks: {
              test: {
                script: 'npm run test',
              },
            },
          },
        },
      });

      expect(config2.defaults.docker?.labels).to.include({
        'emb/project': 'test',
      });
    });
  });
});
