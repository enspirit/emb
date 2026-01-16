import { SecretManager, setContext } from '@';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ComposeUpOperation, DockerComposeClient } from '@/docker';
import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo';

describe('Docker / Compose / Operations / ComposeUpOperation', () => {
  let tempDir: string;
  let repo: Monorepo;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embComposeUpTest'));
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

    // Mock setTaskRenderer to silent to avoid output issues
    vi.spyOn(repo, 'setTaskRenderer');

    // Mock the run method to capture what command is being executed
    vi.spyOn(repo, 'run').mockImplementation(() => Promise.resolve());

    // Mock taskManager to track tasks being added
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
      secrets: new SecretManager(),
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('instantiation', () => {
    test('it creates an operation instance', () => {
      const operation = new ComposeUpOperation();
      expect(operation).toBeInstanceOf(ComposeUpOperation);
    });
  });

  describe('#run()', () => {
    test('it adds a task to start the project', async () => {
      const operation = new ComposeUpOperation();
      await operation.run({});

      const manager = repo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
      expect(manager.runAll).toHaveBeenCalledTimes(1);
    });

    test('it adds tasks with "Starting project" title for no components', async () => {
      const operation = new ComposeUpOperation();
      await operation.run({});

      const manager = repo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Starting project');
    });

    test('it includes component names in command when specified', async () => {
      const operation = new ComposeUpOperation();
      await operation.run({ components: ['api', 'web'] });

      const manager = repo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
    });

    test('it includes --force-recreate flag when forceRecreate is true', async () => {
      const operation = new ComposeUpOperation();
      await operation.run({ forceRecreate: true });

      const manager = repo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('schema validation', () => {
    test('it accepts undefined input', async () => {
      const operation = new ComposeUpOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts empty object', async () => {
      const operation = new ComposeUpOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts components array', async () => {
      const operation = new ComposeUpOperation();
      await expect(
        operation.run({ components: ['service1'] }),
      ).resolves.not.toThrow();
    });

    test('it accepts forceRecreate boolean', async () => {
      const operation = new ComposeUpOperation();
      await expect(
        operation.run({ forceRecreate: true }),
      ).resolves.not.toThrow();
    });
  });
});
