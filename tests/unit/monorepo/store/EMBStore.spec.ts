import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { EMBStore, Monorepo } from '@/monorepo';

describe('Monorepo / Store / EMBStore', () => {
  let tempDir: string;
  let monorepo: Monorepo;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embStoreTest'));
    monorepo = new Monorepo(
      {
        project: { name: 'test-project' },
        plugins: [],
        components: {},
      },
      tempDir,
    );
    // Don't call init() here - we want to test store initialization separately
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    test('it uses default .emb directory', () => {
      const store = new EMBStore(monorepo);

      // The store path should include .emb
      expect(store.join('test.txt')).toContain('.emb');
    });

    test('it uses custom directory when provided', () => {
      const store = new EMBStore(monorepo, '.custom-store');

      expect(store.join('test.txt')).toContain('.custom-store');
    });
  });

  describe('#init()', () => {
    test('it creates the store directory', async () => {
      const store = new EMBStore(monorepo);

      await store.init();

      const storePath = join(tempDir, '.emb');
      const stats = await stat(storePath);
      expect(stats.isDirectory()).toBe(true);
    });

    test('it does not fail if directory already exists', async () => {
      const store = new EMBStore(monorepo);
      await mkdir(join(tempDir, '.emb'), { recursive: true });

      // Should not throw
      await store.init();

      const storePath = join(tempDir, '.emb');
      const stats = await stat(storePath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('#join()', () => {
    test('it builds path with flavor', async () => {
      const store = new EMBStore(monorepo);

      const path = store.join('logs/test.log');

      // Default flavor is 'default'
      expect(path).toBe(join(tempDir, '.emb', 'default', 'logs/test.log'));
    });
  });

  describe('#writeFile() and #readFile()', () => {
    test('it writes and reads file content', async () => {
      const store = new EMBStore(monorepo);
      await store.init();

      await store.writeFile('test.txt', 'Hello, World!');
      const content = await store.readFile('test.txt');

      expect(content).toBe('Hello, World!');
    });

    test('it creates nested directories when writing', async () => {
      const store = new EMBStore(monorepo);
      await store.init();

      await store.writeFile('deep/nested/path/file.txt', 'nested content');
      const content = await store.readFile('deep/nested/path/file.txt');

      expect(content).toBe('nested content');
    });

    test('readFile throws when file does not exist and mustExist is true', async () => {
      const store = new EMBStore(monorepo);
      await store.init();

      await expect(store.readFile('nonexistent.txt')).rejects.toThrow();
    });

    test('readFile returns undefined when file does not exist and mustExist is false', async () => {
      const store = new EMBStore(monorepo);
      await store.init();

      const content = await store.readFile('nonexistent.txt', false);

      expect(content).toBeUndefined();
    });
  });

  describe('#stat()', () => {
    test('it returns file stats when file exists', async () => {
      const store = new EMBStore(monorepo);
      await store.init();
      await store.writeFile('test.txt', 'content');

      const stats = await store.stat('test.txt');

      expect(stats).toBeDefined();
      expect(stats!.isFile()).toBe(true);
    });

    test('it throws when file does not exist and mustExist is true', async () => {
      const store = new EMBStore(monorepo);
      await store.init();

      await expect(store.stat('nonexistent.txt')).rejects.toThrow();
    });

    test('it returns undefined when file does not exist and mustExist is false', async () => {
      const store = new EMBStore(monorepo);
      await store.init();

      const stats = await store.stat('nonexistent.txt', false);

      expect(stats).toBeUndefined();
    });
  });

  describe('#mkdirp()', () => {
    test('it creates nested directories', async () => {
      const store = new EMBStore(monorepo);
      await store.init();

      await store.mkdirp('a/b/c');

      const dirPath = store.join('a/b/c');
      const stats = await stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    test('it normalizes paths to prevent directory traversal', async () => {
      const store = new EMBStore(monorepo);
      await store.init();

      // Attempting to escape should be normalized
      await store.mkdirp('../../../escape/attempt');

      // The path should still be within the store
      const createdPath = store.join('/escape/attempt');
      const stats = await stat(createdPath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('#createWriteStream()', () => {
    test('it creates a writable stream', async () => {
      const store = new EMBStore(monorepo);
      await store.init();

      const stream = await store.createWriteStream('stream-test.txt');

      // Write some data
      await new Promise<void>((resolve, reject) => {
        stream.write('stream content', (err) => {
          if (err) {
            reject(err);
          }

          stream.end(resolve);
        });
      });

      // Verify content was written
      const content = await store.readFile('stream-test.txt');
      expect(content).toBe('stream content');
    });
  });

  describe('#createReadStream()', () => {
    test('it creates a readable stream', async () => {
      const store = new EMBStore(monorepo);
      await store.init();
      await store.writeFile('readable.txt', 'readable content');

      const stream = await store.createReadStream('readable.txt');

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }

      const content = Buffer.concat(chunks).toString();

      expect(content).toBe('readable content');
    });
  });

  describe('#trash()', () => {
    test('it removes the entire store directory', async () => {
      const store = new EMBStore(monorepo);
      await store.init();
      await store.writeFile('test.txt', 'content');

      await store.trash();

      // Store directory should no longer exist
      await expect(stat(join(tempDir, '.emb'))).rejects.toThrow();
    });

    test('it does not fail if store does not exist', async () => {
      const store = new EMBStore(monorepo);

      // Should not throw even if store was never created
      await store.trash();
    });
  });
});
