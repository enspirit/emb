import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  GitPrerequisitePlugin,
  PrerequisiteType,
} from '../../../src/prerequisites/index.js';

describe('Prerequisites / GitPrerequisitePlugin', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embGitPrereq'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('instantiation', () => {
    test('it creates a plugin instance', () => {
      const plugin = new GitPrerequisitePlugin();
      expect(plugin).toBeInstanceOf(GitPrerequisitePlugin);
    });
  });

  describe('#collect()', () => {
    test('it returns file prerequisites from a git repository', async () => {
      // Initialize a git repo
      const { execa } = await import('execa');
      await execa('git', ['init'], { cwd: tempDir });
      await execa('git', ['config', 'user.email', 'test@test.com'], {
        cwd: tempDir,
      });
      await execa('git', ['config', 'user.name', 'Test'], { cwd: tempDir });

      // Create and add some files
      await writeFile(join(tempDir, 'file1.ts'), 'content1');
      await writeFile(join(tempDir, 'file2.ts'), 'content2');
      await mkdir(join(tempDir, 'src'), { recursive: true });
      await writeFile(join(tempDir, 'src', 'index.ts'), 'export {}');

      await execa('git', ['add', '.'], { cwd: tempDir });
      await execa('git', ['commit', '-m', 'initial'], { cwd: tempDir });

      const plugin = new GitPrerequisitePlugin();
      const result = await plugin.collect(tempDir);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((r) => r.type === PrerequisiteType.file)).toBe(true);

      const paths = result.map((r) => r.path);
      expect(paths).toContain('file1.ts');
      expect(paths).toContain('file2.ts');
      expect(paths).toContain('src/index.ts');
    });

    test('it returns empty array for repo with no files', async () => {
      const { execa } = await import('execa');
      await execa('git', ['init'], { cwd: tempDir });

      const plugin = new GitPrerequisitePlugin();
      const result = await plugin.collect(tempDir);

      expect(result).toEqual([]);
    });

    test('it only returns tracked files', async () => {
      const { execa } = await import('execa');
      await execa('git', ['init'], { cwd: tempDir });
      await execa('git', ['config', 'user.email', 'test@test.com'], {
        cwd: tempDir,
      });
      await execa('git', ['config', 'user.name', 'Test'], { cwd: tempDir });

      // Create tracked file
      await writeFile(join(tempDir, 'tracked.ts'), 'content');
      await execa('git', ['add', 'tracked.ts'], { cwd: tempDir });
      await execa('git', ['commit', '-m', 'add tracked'], { cwd: tempDir });

      // Create untracked file
      await writeFile(join(tempDir, 'untracked.ts'), 'content');

      const plugin = new GitPrerequisitePlugin();
      const result = await plugin.collect(tempDir);

      const paths = result.map((r) => r.path);
      expect(paths).toContain('tracked.ts');
      expect(paths).not.toContain('untracked.ts');
    });
  });
});
