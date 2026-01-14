import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { Component } from '@/monorepo';

import {
  FilePrerequisitePlugin,
  PrerequisiteType,
} from '../../../src/prerequisites/index.js';

describe('Prerequisites / FilePrerequisitePlugin', () => {
  let tempDir: string;
  let mockComponent: Component;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embFilePrereq'));

    mockComponent = {
      name: 'mycomponent',
      rootDir: tempDir,
      join: vi.fn((path: string) => join(tempDir, path)),
    } as unknown as Component;
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('instantiation', () => {
    test('it creates a plugin instance', () => {
      const plugin = new FilePrerequisitePlugin();
      expect(plugin).toBeInstanceOf(FilePrerequisitePlugin);
    });
  });

  describe('#meta()', () => {
    test('it returns current timestamp for post mode', async () => {
      const plugin = new FilePrerequisitePlugin();
      const before = Date.now();

      const result = await plugin.meta(mockComponent, [], 'post');

      const after = Date.now();
      const resultNum = Number.parseInt(result, 10);
      expect(resultNum).toBeGreaterThanOrEqual(before);
      expect(resultNum).toBeLessThanOrEqual(after);
    });

    test('it returns max mtime for pre mode', async () => {
      // Create files with different modification times
      await writeFile(join(tempDir, 'file1.ts'), 'content1');
      await new Promise((r) => {
        setTimeout(r, 50);
      });
      await writeFile(join(tempDir, 'file2.ts'), 'content2');

      const prerequisites = [
        { path: 'file1.ts', type: PrerequisiteType.file as const },
        { path: 'file2.ts', type: PrerequisiteType.file as const },
      ];

      const plugin = new FilePrerequisitePlugin();
      const result = await plugin.meta(mockComponent, prerequisites, 'pre');

      expect(result).toBeDefined();
      const resultNum = Number.parseInt(result, 10);
      expect(resultNum).toBeGreaterThan(0);
    });

    test('it returns 0 for empty prerequisites in pre mode', async () => {
      const plugin = new FilePrerequisitePlugin();
      const result = await plugin.meta(mockComponent, [], 'pre');

      expect(result).toBe('0');
    });

    test('it throws for invalid mode', async () => {
      const plugin = new FilePrerequisitePlugin();

      await expect(
        plugin.meta(mockComponent, [], 'invalid' as never),
      ).rejects.toThrow("Invalid mode passed to 'meta()': invalid");
    });
  });

  describe('#diff()', () => {
    test('it returns changed files when mtime is newer than previous', async () => {
      // Create a file
      await writeFile(join(tempDir, 'changed.ts'), 'content');

      const prerequisites = [
        { path: 'changed.ts', type: PrerequisiteType.file as const },
      ];

      const plugin = new FilePrerequisitePlugin();

      // Use a timestamp from the past
      const oldTimestamp = '1000';

      const result = await plugin.diff(
        mockComponent,
        prerequisites,
        oldTimestamp,
        '',
      );

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].path).toBe('changed.ts');
    });

    test('it returns null when no files have changed', async () => {
      await writeFile(join(tempDir, 'unchanged.ts'), 'content');

      const prerequisites = [
        { path: 'unchanged.ts', type: PrerequisiteType.file as const },
      ];

      const plugin = new FilePrerequisitePlugin();

      // Use a timestamp far in the future
      const futureTimestamp = (Date.now() + 1_000_000_000).toString();

      const result = await plugin.diff(
        mockComponent,
        prerequisites,
        futureTimestamp,
        '',
      );

      expect(result).toBeNull();
    });

    test('it returns only changed files from mixed set', async () => {
      await writeFile(join(tempDir, 'old.ts'), 'content');
      const oldTime = Date.now();
      await new Promise((r) => {
        setTimeout(r, 50);
      });
      await writeFile(join(tempDir, 'new.ts'), 'content');

      const prerequisites = [
        { path: 'old.ts', type: PrerequisiteType.file as const },
        { path: 'new.ts', type: PrerequisiteType.file as const },
      ];

      const plugin = new FilePrerequisitePlugin();

      // Use timestamp between the two file creations
      const result = await plugin.diff(
        mockComponent,
        prerequisites,
        oldTime.toString(),
        '',
      );

      expect(result).not.toBeNull();
      expect(result!.some((r) => r.path === 'new.ts')).toBe(true);
    });
  });
});
