import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { BuildResourcesOperation } from '../../../../../src/monorepo/operations/resources/BuildResourcesOperation.js';

const fileExists = async (p: string): Promise<boolean> => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

describe('Monorepo / Operations / Resources / BuildResourcesOperation', () => {
  let setup: TestSetup;

  beforeEach(async () => {
    setup = await createTestSetup({
      tempDirPrefix: 'embBuildResourcesTest',
      embfile: {
        project: { name: 'test-build' },
        plugins: [],
        components: {
          api: {
            resources: {
              testfile: {
                type: 'file',
                params: {
                  path: 'output.txt',
                },
              },
            },
          },
        },
      },
    });
    await mkdir(join(setup.tempDir, 'api'), { recursive: true });
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  describe('#run()', () => {
    test('it builds a file resource and creates the file', async () => {
      const result = await setup.monorepo.run(new BuildResourcesOperation(), {
        resources: ['testfile'],
        silent: true,
      });

      expect(result['api:testfile']).toBeDefined();
      expect(result['api:testfile'].resource?.id).toBe('api:testfile');

      // Verify file was created
      const fileStat = await stat(join(setup.tempDir, 'api', 'output.txt'));
      expect(fileStat.isFile()).toBe(true);
    });

    test('it supports dry run mode without creating file', async () => {
      const result = await setup.monorepo.run(new BuildResourcesOperation(), {
        resources: ['testfile'],
        dryRun: true,
        silent: true,
      });

      expect(result['api:testfile']).toBeDefined();
      expect(result['api:testfile'].dryRun).toBe(true);
    });

    test('it detects cache hit when file exists', async () => {
      // Create the file first
      await writeFile(join(setup.tempDir, 'api', 'output.txt'), 'existing');

      const result = await setup.monorepo.run(new BuildResourcesOperation(), {
        resources: ['testfile'],
        silent: true,
      });

      expect(result['api:testfile']).toBeDefined();
      expect(result['api:testfile'].cacheHit).toBe(true);
    });

    test('it forces rebuild when force option is set', async () => {
      // Create the file first
      await writeFile(join(setup.tempDir, 'api', 'output.txt'), 'existing');

      const result = await setup.monorepo.run(new BuildResourcesOperation(), {
        resources: ['testfile'],
        force: true,
        silent: true,
      });

      expect(result['api:testfile']).toBeDefined();
      expect(result['api:testfile'].force).toBe(true);
    });

    test('it builds multiple resources', async () => {
      await mkdir(join(setup.tempDir, 'frontend'), { recursive: true });

      const multiSetup = await createTestSetup({
        tempDirPrefix: 'embBuildMultiTest',
        embfile: {
          project: { name: 'test-build' },
          plugins: [],
          components: {
            api: {
              resources: {
                file1: {
                  type: 'file',
                  params: { path: 'file1.txt' },
                },
              },
            },
            frontend: {
              resources: {
                file2: {
                  type: 'file',
                  params: { path: 'file2.txt' },
                },
              },
            },
          },
        },
      });

      await mkdir(join(multiSetup.tempDir, 'api'), { recursive: true });
      await mkdir(join(multiSetup.tempDir, 'frontend'), { recursive: true });

      try {
        const result = await multiSetup.monorepo.run(
          new BuildResourcesOperation(),
          {
            resources: ['file1', 'file2'],
            silent: true,
          },
        );

        expect(Object.keys(result).length).toBe(2);
        expect(result['api:file1']).toBeDefined();
        expect(result['frontend:file2']).toBeDefined();
      } finally {
        await multiSetup.cleanup();
      }
    });

    test('it respects resource dependencies ordering', async () => {
      const depSetup = await createTestSetup({
        tempDirPrefix: 'embBuildDepsTest',
        embfile: {
          project: { name: 'test-build' },
          plugins: [],
          components: {
            api: {
              resources: {
                base: {
                  type: 'file',
                  params: { path: 'base.txt' },
                },
                dependent: {
                  type: 'file',
                  params: { path: 'dependent.txt' },
                  dependencies: ['api:base'],
                },
              },
            },
          },
        },
      });

      await mkdir(join(depSetup.tempDir, 'api'), { recursive: true });

      try {
        const result = await depSetup.monorepo.run(
          new BuildResourcesOperation(),
          {
            resources: ['dependent'],
            silent: true,
          },
        );

        // Both base and dependent should be built
        expect(result['api:base']).toBeDefined();
        expect(result['api:dependent']).toBeDefined();
      } finally {
        await depSetup.cleanup();
      }
    });
  });

  describe('#run() — parallelism & failures', () => {
    test('respects dependency order under -j (a dependent build sees its dependency output)', async () => {
      const s = await createTestSetup({
        tempDirPrefix: 'embBuildParallelOrder',
        embfile: {
          project: { name: 'test-build' },
          plugins: [],
          components: {
            api: {
              resources: {
                base: {
                  type: 'file',
                  params: { path: 'base.txt', script: 'echo base > base.txt' },
                },
                dependent: {
                  type: 'file',
                  params: {
                    path: 'dependent.txt',
                    // Only succeeds if base.txt already exists (base built first).
                    script: 'cat base.txt > dependent.txt',
                  },
                  dependencies: ['api:base'],
                },
              },
            },
          },
        },
      });
      await mkdir(join(s.tempDir, 'api'), { recursive: true });

      try {
        const result = await s.monorepo.run(new BuildResourcesOperation(), {
          resources: ['dependent'],
          jobs: 4,
          silent: true,
        });

        expect(result['api:base']).toBeDefined();
        expect(result['api:dependent']).toBeDefined();
        expect(await fileExists(join(s.tempDir, 'api', 'dependent.txt'))).toBe(
          true,
        );
      } finally {
        await s.cleanup();
      }
    });

    test('keepGoing keeps building independents, skips a failed dep’s dependents, and rejects', async () => {
      const s = await createTestSetup({
        tempDirPrefix: 'embBuildKeepGoing',
        embfile: {
          project: { name: 'test-build' },
          plugins: [],
          components: {
            api: {
              resources: {
                bad: {
                  type: 'file',
                  params: { path: 'bad.txt', script: 'exit 1' },
                },
                child: {
                  type: 'file',
                  params: { path: 'child.txt', script: 'echo x > child.txt' },
                  dependencies: ['api:bad'],
                },
                good: {
                  type: 'file',
                  params: { path: 'good.txt', script: 'echo x > good.txt' },
                },
              },
            },
          },
        },
      });
      await mkdir(join(s.tempDir, 'api'), { recursive: true });

      try {
        let error: unknown;
        try {
          await s.monorepo.run(new BuildResourcesOperation(), {
            resources: ['bad', 'child', 'good'],
            keepGoing: true,
            jobs: 4,
            silent: true,
          });
        } catch (error_) {
          error = error_;
        }

        expect(error).toBeDefined();
        expect((error as Error).message).toMatch(/api:bad/);
        // the dependent of the failed resource is reported as skipped
        expect((error as Error).message).toMatch(/api:child/);
        // the independent resource still built
        expect(await fileExists(join(s.tempDir, 'api', 'good.txt'))).toBe(true);
        // the dependent of the failure was skipped (never built)
        expect(await fileExists(join(s.tempDir, 'api', 'child.txt'))).toBe(
          false,
        );
      } finally {
        await s.cleanup();
      }
    });

    test('fail-fast (default): a failing build rejects the operation', async () => {
      const s = await createTestSetup({
        tempDirPrefix: 'embBuildFailFast',
        embfile: {
          project: { name: 'test-build' },
          plugins: [],
          components: {
            api: {
              resources: {
                bad: {
                  type: 'file',
                  params: { path: 'bad.txt', script: 'exit 1' },
                },
              },
            },
          },
        },
      });
      await mkdir(join(s.tempDir, 'api'), { recursive: true });

      try {
        await expect(
          s.monorepo.run(new BuildResourcesOperation(), {
            resources: ['bad'],
            silent: true,
          }),
        ).rejects.toThrow(/Failed to build/);
      } finally {
        await s.cleanup();
      }
    });
  });
});
