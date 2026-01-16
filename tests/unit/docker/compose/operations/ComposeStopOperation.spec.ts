import { SecretManager, setContext } from '@';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ComposeStopOperation, DockerComposeClient } from '@/docker';
import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo';

describe('Docker / Compose / Operations / ComposeStopOperation', () => {
  let tempDir: string;
  let repo: Monorepo;
  let mockOutput: PassThrough;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embComposeStopTest'));
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

    // Mock the run method to return a Readable stream
    vi.spyOn(repo, 'run').mockResolvedValue(new Readable() as never);

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
    test('it creates an operation instance with output stream', () => {
      const operation = new ComposeStopOperation(mockOutput);
      expect(operation).toBeInstanceOf(ComposeStopOperation);
    });
  });

  describe('#run()', () => {
    test('it calls monorepo.run with ExecuteLocalCommandOperation', async () => {
      const operation = new ComposeStopOperation(mockOutput);
      await operation.run({});

      expect(repo.run).toHaveBeenCalledTimes(1);
    });

    test('it returns a Readable stream', async () => {
      const operation = new ComposeStopOperation(mockOutput);
      const result = await operation.run({});

      expect(result).toBeInstanceOf(Readable);
    });

    test('it accepts empty object as input', async () => {
      const operation = new ComposeStopOperation(mockOutput);
      await expect(operation.run({})).resolves.not.toThrow();
    });
  });

  describe('schema validation', () => {
    test('it accepts undefined input', async () => {
      const operation = new ComposeStopOperation(mockOutput);
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts empty object', async () => {
      const operation = new ComposeStopOperation(mockOutput);
      await expect(operation.run({})).resolves.not.toThrow();
    });
  });
});
