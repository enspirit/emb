import { SecretManager, setContext } from '@';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ComposePsOperation, DockerComposeClient } from '@/docker';
import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo';

describe('Docker / Compose / Operations / ComposePsOperation', () => {
  let tempDir: string;
  let repo: Monorepo;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embComposePsTest'));
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

    // Mock setTaskRenderer
    vi.spyOn(repo, 'setTaskRenderer');

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
      const operation = new ComposePsOperation();
      expect(operation).toBeInstanceOf(ComposePsOperation);
    });
  });

  describe('#run()', () => {
    test('it sets task renderer to silent', async () => {
      const operation = new ComposePsOperation();
      await operation.run({});

      expect(repo.setTaskRenderer).toHaveBeenCalledWith('silent');
    });

    test('it adds a task to list containers', async () => {
      const operation = new ComposePsOperation();
      await operation.run({});

      const manager = repo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
      expect(manager.runAll).toHaveBeenCalledTimes(1);
    });

    test('it adds task with "Listing running containers" title', async () => {
      const operation = new ComposePsOperation();
      await operation.run({});

      const manager = repo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Listing running containers');
    });
  });

  describe('schema validation', () => {
    test('it accepts undefined input', async () => {
      const operation = new ComposePsOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts empty object', async () => {
      const operation = new ComposePsOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts all flag as boolean', async () => {
      const operation = new ComposePsOperation();
      await expect(operation.run({ all: true })).resolves.not.toThrow();
    });

    test('it accepts all flag as false', async () => {
      const operation = new ComposePsOperation();
      await expect(operation.run({ all: false })).resolves.not.toThrow();
    });
  });
});
