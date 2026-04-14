import {
  mkdir,
  mkdtemp,
  stat,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  computeWatchPaths,
  EmptyWatchPathsError,
  WatchPathAccessError,
} from '../../../../../src/docker/resources/rebuildStrategies/watchPaths.js';

const waitForNewerMtime = async () => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 10);
  });
};

describe('Docker / rebuildStrategies / computeWatchPaths', () => {
  let monorepoRoot: string;
  let dockerContext: string;

  beforeEach(async () => {
    monorepoRoot = await mkdtemp(join(tmpdir(), 'embWatchPaths'));
    dockerContext = join(monorepoRoot, 'components', 'api');
    await mkdir(dockerContext, { recursive: true });
  });

  afterEach(async () => {
    await rimraf(monorepoRoot);
  });

  test('it resolves a plain path relative to the docker context', async () => {
    await writeFile(join(dockerContext, 'Dockerfile'), 'FROM node:18\n');

    const result = await computeWatchPaths({ dockerContext, monorepoRoot }, [
      'Dockerfile',
    ]);

    const dfStats = await stat(join(dockerContext, 'Dockerfile'));
    expect(result.mtime).toBe(dfStats.mtime.getTime());
    expect(result.watched).toEqual([
      { path: 'Dockerfile', mtime: dfStats.mtime.getTime() },
    ]);
  });

  test('it resolves a /-prefixed path relative to the monorepo root', async () => {
    await writeFile(join(monorepoRoot, 'pnpm-lock.yaml'), 'lock');

    const result = await computeWatchPaths({ dockerContext, monorepoRoot }, [
      '/pnpm-lock.yaml',
    ]);

    const lockStats = await stat(join(monorepoRoot, 'pnpm-lock.yaml'));
    expect(result.mtime).toBe(lockStats.mtime.getTime());
    expect(result.watched).toEqual([
      { path: '/pnpm-lock.yaml', mtime: lockStats.mtime.getTime() },
    ]);
  });

  test('it returns the max mtime across several matched files', async () => {
    await writeFile(join(dockerContext, 'Dockerfile'), 'FROM node:18\n');
    await waitForNewerMtime();
    await writeFile(join(dockerContext, 'package.json'), '{}');

    const result = await computeWatchPaths({ dockerContext, monorepoRoot }, [
      'Dockerfile',
      'package.json',
    ]);

    const pkgStats = await stat(join(dockerContext, 'package.json'));
    expect(result.mtime).toBe(pkgStats.mtime.getTime());
  });

  test('it expands glob patterns under the docker context', async () => {
    await mkdir(join(dockerContext, 'src'), { recursive: true });
    await writeFile(join(dockerContext, 'src', 'a.ts'), 'export {}');
    await waitForNewerMtime();
    await writeFile(join(dockerContext, 'src', 'b.ts'), 'export {}');

    const result = await computeWatchPaths({ dockerContext, monorepoRoot }, [
      'src/**/*.ts',
    ]);

    expect(result.watched).toHaveLength(2);
    const paths = (result.watched ?? []).map((w) => w.path).sort();
    expect(paths).toEqual(['src/a.ts', 'src/b.ts']);
  });

  test('it reports the newest matched path in the reason string', async () => {
    await writeFile(join(dockerContext, 'Dockerfile'), 'FROM node:18\n');
    await waitForNewerMtime();
    await writeFile(join(dockerContext, 'package.json'), '{}');

    const result = await computeWatchPaths({ dockerContext, monorepoRoot }, [
      'Dockerfile',
      'package.json',
    ]);

    expect(result.reason).toContain('strategy=watch-paths');
    expect(result.reason).toContain('package.json');
  });

  test('it throws EmptyWatchPathsError when no pattern matches', async () => {
    await expect(
      computeWatchPaths({ dockerContext, monorepoRoot }, [
        'does-not-exist.txt',
        '/also-missing.yaml',
      ]),
    ).rejects.toBeInstanceOf(EmptyWatchPathsError);
  });

  test('it deduplicates when the same file is matched by multiple patterns', async () => {
    await writeFile(join(dockerContext, 'Dockerfile'), 'FROM node:18\n');

    const result = await computeWatchPaths({ dockerContext, monorepoRoot }, [
      'Dockerfile',
      'Docker*',
    ]);

    expect(result.watched).toHaveLength(1);
  });

  test('it wraps stat failures as WatchPathAccessError', async () => {
    const target = join(dockerContext, 'target.txt');
    const link = join(dockerContext, 'broken-link.txt');
    await writeFile(target, 'real');
    await symlink(target, link);
    await unlink(target);

    await expect(
      computeWatchPaths({ dockerContext, monorepoRoot }, ['broken-link.txt']),
    ).rejects.toBeInstanceOf(WatchPathAccessError);
  });

  test('the WatchPathAccessError includes the display path', async () => {
    const target = join(dockerContext, 'target.txt');
    const link = join(dockerContext, 'broken-link.txt');
    await writeFile(target, 'real');
    await symlink(target, link);
    await unlink(target);

    try {
      await computeWatchPaths({ dockerContext, monorepoRoot }, [
        'broken-link.txt',
      ]);
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(WatchPathAccessError);
      const watchErr = error as WatchPathAccessError;
      expect(watchErr.path).toBe('broken-link.txt');
      expect(watchErr.message).toContain('broken-link.txt');
    }
  });
});
