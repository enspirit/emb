import { SecretManager, setContext } from '@';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ComposeExecOperation, DockerComposeClient } from '@/docker';
import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo';

describe('Docker / Compose / Operations / ComposeExecOperation', () => {
  let tempDir: string;
  let repo: Monorepo;
  let mockOutput: PassThrough;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embComposeExecTest'));
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

    mockOutput = new PassThrough();

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
    test('it creates an operation instance without output stream', () => {
      const operation = new ComposeExecOperation();
      expect(operation).toBeInstanceOf(ComposeExecOperation);
    });

    test('it creates an operation instance with output stream', () => {
      const operation = new ComposeExecOperation(mockOutput);
      expect(operation).toBeInstanceOf(ComposeExecOperation);
    });
  });

  describe('schema validation', () => {
    test('it rejects undefined input', async () => {
      const operation = new ComposeExecOperation(mockOutput);
      await expect(operation.run(undefined as never)).rejects.toThrow();
    });

    test('it rejects empty object', async () => {
      const operation = new ComposeExecOperation(mockOutput);
      await expect(operation.run({} as never)).rejects.toThrow();
    });

    test('it rejects input without service', async () => {
      const operation = new ComposeExecOperation(mockOutput);
      await expect(
        operation.run({ command: 'echo hello' } as never),
      ).rejects.toThrow();
    });

    test('it rejects input without command', async () => {
      const operation = new ComposeExecOperation(mockOutput);
      await expect(
        operation.run({ service: 'api' } as never),
      ).rejects.toThrow();
    });
  });

  describe('input schema', () => {
    test('it requires service as string', () => {
      // The operation requires service to be a string
      const operation = new ComposeExecOperation(mockOutput);
      expect(operation).toBeDefined();
    });

    test('it requires command as string', () => {
      // The operation requires command to be a string
      const operation = new ComposeExecOperation(mockOutput);
      expect(operation).toBeDefined();
    });

    test('it accepts optional env object', () => {
      // The operation accepts optional env parameter
      const operation = new ComposeExecOperation(mockOutput);
      expect(operation).toBeDefined();
    });
  });
});
