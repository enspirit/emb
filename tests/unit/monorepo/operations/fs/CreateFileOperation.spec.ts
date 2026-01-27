import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { CommandExecError } from '../../../../../src/errors.js';
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

    test('it writes content directly to file when content is provided', async () => {
      const filePath = join(tempDir, 'contentfile.txt');
      const content = 'DATABASE_URL=postgres://localhost\nAPI_KEY=secret123';

      await operation.run({ path: filePath, content });

      const fileStat = await stat(filePath);
      expect(fileStat.isFile()).toBe(true);

      const fileContent = await readFile(filePath, 'utf8');
      expect(fileContent).toBe(content);
    });

    test('it writes empty content when content is empty string', async () => {
      const filePath = join(tempDir, 'emptycontent.txt');

      await operation.run({ path: filePath, content: '' });

      const fileStat = await stat(filePath);
      expect(fileStat.isFile()).toBe(true);
      expect(fileStat.size).toBe(0);
    });

    test('content takes precedence over script', async () => {
      const filePath = join(tempDir, 'precedence.txt');
      const content = 'content wins';

      await operation.run({
        path: filePath,
        content,
        script: `echo "script content" > ${filePath}`,
        cwd: tempDir,
      });

      const fileContent = await readFile(filePath, 'utf8');
      expect(fileContent).toBe(content);
    });

    test('it throws CommandExecError when script exits with non-zero code', async () => {
      const filePath = join(tempDir, 'failedscript.txt');

      await expect(
        operation.run({
          path: filePath,
          script: 'exit 1',
          cwd: tempDir,
        }),
      ).rejects.toThrow(CommandExecError);
    });

    test('it throws CommandExecError when script command does not exist', async () => {
      const filePath = join(tempDir, 'nonexistent.txt');

      await expect(
        operation.run({
          path: filePath,
          script: 'nonexistent_command_that_does_not_exist',
          cwd: tempDir,
        }),
      ).rejects.toThrow(CommandExecError);
    });

    test('it includes exit code in CommandExecError when script fails', async () => {
      const filePath = join(tempDir, 'exitcode.txt');

      try {
        await operation.run({
          path: filePath,
          script: 'exit 42',
          cwd: tempDir,
        });
        expect.fail('Expected operation to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(CommandExecError);
        expect((error as CommandExecError).exitCode).toBe(42);
      }
    });

    test('it includes stderr message in CommandExecError when script fails', async () => {
      const filePath = join(tempDir, 'stderr.txt');

      try {
        await operation.run({
          path: filePath,
          script: 'echo "error message" >&2 && exit 1',
          cwd: tempDir,
        });
        expect.fail('Expected operation to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(CommandExecError);
        expect((error as CommandExecError).message).toContain('error message');
      }
    });
  });
});
