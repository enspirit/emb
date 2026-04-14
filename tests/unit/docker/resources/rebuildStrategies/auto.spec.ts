import { mkdtemp, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { computeAuto } from '../../../../../src/docker/resources/rebuildStrategies/auto.js';

const initGit = async (cwd: string) => {
  const { execa } = await import('execa');
  await execa('git', ['init'], { cwd });
  await execa('git', ['config', 'user.email', 'test@test.com'], { cwd });
  await execa('git', ['config', 'user.name', 'Test'], { cwd });
};

const commitFile = async (cwd: string, name: string, content = 'x') => {
  const { execa } = await import('execa');
  await writeFile(join(cwd, name), content);
  await execa('git', ['add', name], { cwd });
  await execa('git', ['commit', '-m', `add ${name}`], { cwd });
};

const waitForNewerMtime = async () => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 10);
  });
};

describe('Docker / rebuildStrategies / computeAuto', () => {
  let contextDir: string;

  beforeEach(async () => {
    contextDir = await mkdtemp(join(tmpdir(), 'embAutoStrategy'));
  });

  afterEach(async () => {
    await rimraf(contextDir);
  });

  test('it returns the newest mtime across tracked files', async () => {
    await initGit(contextDir);
    await commitFile(contextDir, 'Dockerfile', 'FROM node:18\n');
    await waitForNewerMtime();
    await commitFile(contextDir, 'package.json', '{}');

    const result = await computeAuto({
      dockerContext: contextDir,
      monorepoRoot: contextDir,
    });

    const dfStats = await stat(join(contextDir, 'Dockerfile'));
    const pkgStats = await stat(join(contextDir, 'package.json'));
    const expected = Math.max(
      dfStats.mtime.getTime(),
      pkgStats.mtime.getTime(),
    );
    expect(result?.mtime).toBe(expected);
  });

  test('it ignores untracked files', async () => {
    await initGit(contextDir);
    await commitFile(contextDir, 'Dockerfile', 'FROM node:18\n');
    await waitForNewerMtime();
    await writeFile(join(contextDir, 'scratch.txt'), 'untracked');

    const result = await computeAuto({
      dockerContext: contextDir,
      monorepoRoot: contextDir,
    });

    const dfStats = await stat(join(contextDir, 'Dockerfile'));
    expect(result?.mtime).toBe(dfStats.mtime.getTime());
  });

  test('it returns undefined when no tracked files exist', async () => {
    await initGit(contextDir);

    const result = await computeAuto({
      dockerContext: contextDir,
      monorepoRoot: contextDir,
    });

    expect(result).toBeUndefined();
  });

  test('it tags the reason with the strategy name and the newest path', async () => {
    await initGit(contextDir);
    await commitFile(contextDir, 'Dockerfile', 'FROM node:18\n');

    const result = await computeAuto({
      dockerContext: contextDir,
      monorepoRoot: contextDir,
    });

    expect(result?.reason).toContain('strategy=auto');
    expect(result?.reason).toContain('Dockerfile');
  });

  test('it does not populate the watched list (auto is git-scan-only)', async () => {
    await initGit(contextDir);
    await commitFile(contextDir, 'Dockerfile', 'FROM node:18\n');

    const result = await computeAuto({
      dockerContext: contextDir,
      monorepoRoot: contextDir,
    });

    expect(result?.watched).toBeUndefined();
  });
});
