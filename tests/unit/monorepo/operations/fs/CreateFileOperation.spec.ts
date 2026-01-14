import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { CreateFileOperation } from '../../../../../src/monorepo/operations/fs/CreateFileOperation.js';

describe('Monorepo / Operations / FS / CreateFileOperation', () => {
  let tempDir: string;
  let operation: InstanceType<typeof CreateFileOperation>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embCreateFileTest'));
    operation = new CreateFileOperation();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('#run()', () => {
    test('it creates a file when it does not exist', async () => {
      const filePath = join(tempDir, 'newfile.txt');

      await operation.run({ path: filePath });

      const fileStat = await stat(filePath);
      expect(fileStat.isFile()).toBe(true);
    });

    test('it does not throw when file already exists', async () => {
      const filePath = join(tempDir, 'existing.txt');
      await writeFile(filePath, 'content');

      await expect(operation.run({ path: filePath })).resolves.not.toThrow();
    });

    test('it updates timestamps when force is true and file exists', async () => {
      const filePath = join(tempDir, 'touchfile.txt');
      await writeFile(filePath, 'content');

      // Get original timestamps
      const originalStat = await stat(filePath);
      const originalMtime = originalStat.mtimeMs;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });

      // Run with force=true
      await operation.run({ path: filePath, force: true });

      // Check timestamps were updated
      const newStat = await stat(filePath);
      expect(newStat.mtimeMs).toBeGreaterThan(originalMtime);
    });

    test('it executes script when provided', async () => {
      const filePath = join(tempDir, 'scriptfile.txt');

      await operation.run({
        path: filePath,
        script: `echo "generated content" > ${filePath}`,
        cwd: tempDir,
      });

      const fileStat = await stat(filePath);
      expect(fileStat.isFile()).toBe(true);
    });

    test('it runs script in the provided cwd', async () => {
      const subDir = join(tempDir, 'subdir');
      await mkdir(subDir);
      const filePath = join(subDir, 'output.txt');

      await operation.run({
        path: filePath,
        script: 'pwd > output.txt',
        cwd: subDir,
      });

      const fileStat = await stat(filePath);
      expect(fileStat.isFile()).toBe(true);
    });

    test('it creates an empty file when no script provided', async () => {
      const filePath = join(tempDir, 'emptyfile.txt');

      await operation.run({ path: filePath });

      const fileStat = await stat(filePath);
      expect(fileStat.isFile()).toBe(true);
      expect(fileStat.size).toBe(0);
    });
  });
});
