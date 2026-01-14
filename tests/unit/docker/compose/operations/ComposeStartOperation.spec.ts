import { setContext } from '@';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ComposeStartOperation, DockerComposeClient } from '@/docker';
import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo';

describe('Docker / Compose / Operations / ComposeStartOperation', () => {
  let tempDir: string;
  let repo: Monorepo;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embComposeStartTest'));
    await mkdir(join(tempDir, '.emb'), { recursive: true });

    repo = new Monorepo(
      {
        project: { name: 'test-compose' },
        plugins: [],
        components: {},
      },
      tempDir,
    );

    await repo.init();

    // Mock the run method
    vi.spyOn(repo, 'run').mockImplementation(() => Promise.resolve());

    // Mock taskManager
    const mockManager = {
      add: vi.fn(),
      runAll: vi.fn().mockImplementation(() => Promise.resolve()),
    };
    vi.spyOn(repo, 'taskManager').mockReturnValue(mockManager as never);

    const compose = new DockerComposeClient(repo);
    vi.spyOn(compose, 'isService').mockResolvedValue(false);

    setContext({
      docker: vi.mockObject({} as never),
      kubernetes: vi.mockObject(createKubernetesClient()),
      monorepo: repo,
      compose,
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('instantiation', () => {
    test('it creates an operation instance', () => {
      const operation = new ComposeStartOperation();
      expect(operation).toBeInstanceOf(ComposeStartOperation);
    });
  });

  describe('#run()', () => {
    test('it adds a task to start containers', async () => {
      const operation = new ComposeStartOperation();
      await operation.run({});

      const manager = repo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
      expect(manager.runAll).toHaveBeenCalledTimes(1);
    });

    test('it uses "Starting project" title when no services specified', async () => {
      const operation = new ComposeStartOperation();
      await operation.run({});

      const manager = repo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks[0].title).toBe('Starting project');
    });

    test('it includes service names in title when services specified', async () => {
      const operation = new ComposeStartOperation();
      await operation.run({ services: ['api', 'web'] });

      const manager = repo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks[0].title).toBe('Starting api, web');
    });
  });

  describe('schema validation', () => {
    test('it accepts undefined input', async () => {
      const operation = new ComposeStartOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts empty object', async () => {
      const operation = new ComposeStartOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts services array', async () => {
      const operation = new ComposeStartOperation();
      await expect(operation.run({ services: ['api'] })).resolves.not.toThrow();
    });

    test('it accepts multiple services', async () => {
      const operation = new ComposeStartOperation();
      await expect(
        operation.run({ services: ['api', 'web', 'db'] }),
      ).resolves.not.toThrow();
    });
  });
});
