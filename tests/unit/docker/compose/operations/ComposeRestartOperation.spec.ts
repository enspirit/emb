import { SecretManager, setContext } from '@';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ComposeRestartOperation, DockerComposeClient } from '@/docker';
import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo';

describe('Docker / Compose / Operations / ComposeRestartOperation', () => {
  let tempDir: string;
  let repo: Monorepo;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embComposeRestartTest'));
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
      secrets: new SecretManager(),
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('instantiation', () => {
    test('it creates an operation instance', () => {
      const operation = new ComposeRestartOperation();
      expect(operation).toBeInstanceOf(ComposeRestartOperation);
    });
  });

  describe('#run()', () => {
    test('it adds a task to restart containers', async () => {
      const operation = new ComposeRestartOperation();
      await operation.run({});

      const manager = repo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
      expect(manager.runAll).toHaveBeenCalledTimes(1);
    });

    test('it uses "Restarting project" title when no services specified', async () => {
      const operation = new ComposeRestartOperation();
      await operation.run({});

      const manager = repo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks[0].title).toBe('Restarting project');
    });

    test('it includes service names in title when services specified', async () => {
      const operation = new ComposeRestartOperation();
      await operation.run({ services: ['api', 'web'] });

      const manager = repo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks[0].title).toBe('Restarting api, web');
    });
  });

  describe('schema validation', () => {
    test('it accepts undefined input', async () => {
      const operation = new ComposeRestartOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts empty object', async () => {
      const operation = new ComposeRestartOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts services array', async () => {
      const operation = new ComposeRestartOperation();
      await expect(operation.run({ services: ['api'] })).resolves.not.toThrow();
    });

    test('it accepts noDeps boolean', async () => {
      const operation = new ComposeRestartOperation();
      await expect(operation.run({ noDeps: true })).resolves.not.toThrow();
    });

    test('it accepts both services and noDeps', async () => {
      const operation = new ComposeRestartOperation();
      await expect(
        operation.run({ services: ['api'], noDeps: true }),
      ).resolves.not.toThrow();
    });
  });
});
