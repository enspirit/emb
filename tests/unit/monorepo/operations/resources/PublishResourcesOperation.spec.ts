import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { CliError } from '../../../../../src/errors.js';
import { PublishResourcesOperation } from '../../../../../src/monorepo/operations/resources/PublishResourcesOperation.js';
import { ResourceFactory } from '../../../../../src/monorepo/resources/ResourceFactory.js';

describe('Monorepo / Operations / Resources / PublishResourcesOperation', () => {
  let setup: TestSetup;

  beforeEach(async () => {
    setup = await createTestSetup({
      tempDirPrefix: 'embPublishResourcesTest',
      embfile: {
        project: { name: 'test-publish' },
        plugins: [],
        components: {
          api: {
            resources: {
              image: {
                type: 'docker/image',
                publish: true,
              },
              config: {
                type: 'file',
                publish: false,
                params: {
                  path: 'config.txt',
                },
              },
            },
          },
          web: {
            resources: {
              image: {
                type: 'docker/image',
                publish: true,
              },
            },
          },
          internal: {
            resources: {
              image: {
                type: 'docker/image',
                // No publish flag - should not be published
              },
            },
          },
        },
      },
    });
    await mkdir(join(setup.tempDir, 'api'), { recursive: true });
    await mkdir(join(setup.tempDir, 'web'), { recursive: true });
    await mkdir(join(setup.tempDir, 'internal'), { recursive: true });
  });

  afterEach(async () => {
    await setup.cleanup();
    vi.restoreAllMocks();
  });

  describe('#run()', () => {
    test('it only selects resources with publish: true', async () => {
      // Mock the publish method to track calls
      const publishCalls: string[] = [];
      const originalFactor = ResourceFactory.factor.bind(ResourceFactory);

      vi.spyOn(ResourceFactory, 'factor').mockImplementation(
        (type, context) => {
          const builder = originalFactor(type, context);
          if (type === 'docker/image') {
            builder.publish = vi.fn(async () => {
              publishCalls.push(context.config.id);
            });
          }

          return builder;
        },
      );

      const result = await setup.monorepo.run(new PublishResourcesOperation(), {
        silent: true,
      });

      // Only api:image and web:image should be published (publish: true)
      // internal:image should not (no publish flag)
      expect(publishCalls).toContain('api:image');
      expect(publishCalls).toContain('web:image');
      expect(publishCalls).not.toContain('internal:image');
      expect(Object.keys(result)).toHaveLength(2);
    });

    test('it supports dry run mode without publishing', async () => {
      const publishCalls: string[] = [];
      const originalFactor = ResourceFactory.factor.bind(ResourceFactory);

      vi.spyOn(ResourceFactory, 'factor').mockImplementation(
        (type, context) => {
          const builder = originalFactor(type, context);
          if (type === 'docker/image') {
            builder.publish = vi.fn(async () => {
              publishCalls.push(context.config.id);
            });
          }

          return builder;
        },
      );

      const result = await setup.monorepo.run(new PublishResourcesOperation(), {
        dryRun: true,
        silent: true,
      });

      // No actual publish calls in dry run
      expect(publishCalls).toHaveLength(0);

      // But result should contain the resources that would be published
      expect(result['api:image']).toBeDefined();
      expect(result['api:image'].skipped).toBe(true);
      expect(result['api:image'].skipReason).toBe('dry run');
    });

    test('it publishes specific resources when specified', async () => {
      const publishCalls: string[] = [];
      const originalFactor = ResourceFactory.factor.bind(ResourceFactory);

      vi.spyOn(ResourceFactory, 'factor').mockImplementation(
        (type, context) => {
          const builder = originalFactor(type, context);
          if (type === 'docker/image') {
            builder.publish = vi.fn(async () => {
              publishCalls.push(context.config.id);
            });
          }

          return builder;
        },
      );

      const result = await setup.monorepo.run(new PublishResourcesOperation(), {
        resources: ['api:image'],
        silent: true,
      });

      // Only api:image should be published
      expect(publishCalls).toEqual(['api:image']);
      expect(Object.keys(result)).toHaveLength(1);
    });

    test('it throws error when resource type does not support publishing', async () => {
      const badSetup = await createTestSetup({
        tempDirPrefix: 'embPublishBadTest',
        embfile: {
          project: { name: 'test-bad-publish' },
          plugins: [],
          components: {
            api: {
              resources: {
                config: {
                  type: 'file',
                  publish: true, // file type doesn't support publish
                  params: {
                    path: 'config.txt',
                  },
                },
              },
            },
          },
        },
      });

      await mkdir(join(badSetup.tempDir, 'api'), { recursive: true });

      try {
        await expect(
          badSetup.monorepo.run(new PublishResourcesOperation(), {
            silent: true,
          }),
        ).rejects.toThrow(CliError);

        await expect(
          badSetup.monorepo.run(new PublishResourcesOperation(), {
            silent: true,
          }),
        ).rejects.toThrow(/does not support publishing/);
      } finally {
        await badSetup.cleanup();
      }
    });

    test('it returns empty result when no publishable resources exist', async () => {
      const emptySetup = await createTestSetup({
        tempDirPrefix: 'embPublishEmptyTest',
        embfile: {
          project: { name: 'test-empty-publish' },
          plugins: [],
          components: {
            api: {
              resources: {
                image: {
                  type: 'docker/image',
                  // No publish: true
                },
              },
            },
          },
        },
      });

      await mkdir(join(emptySetup.tempDir, 'api'), { recursive: true });

      try {
        const result = await emptySetup.monorepo.run(
          new PublishResourcesOperation(),
          {
            silent: true,
          },
        );

        expect(Object.keys(result)).toHaveLength(0);
      } finally {
        await emptySetup.cleanup();
      }
    });
  });
});
