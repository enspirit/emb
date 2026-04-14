import { glob } from 'glob';
import { stat } from 'node:fs/promises';
import { relative } from 'node:path';

import { EMBError } from '@/errors.js';

import { StrategyContext, StrategyResult, WatchedPath } from './types.js';

export class EmptyWatchPathsError extends EMBError {
  constructor(public readonly patterns: string[]) {
    super(
      'WATCH_PATHS_EMPTY',
      `rebuildTrigger.strategy=watch-paths resolved to zero files. ` +
        `Check the configured paths: ${patterns.join(', ')}`,
    );
  }
}

export class WatchPathAccessError extends EMBError {
  constructor(
    public readonly path: string,
    public readonly cause: Error,
  ) {
    super(
      'WATCH_PATH_ACCESS',
      `Cannot stat watched file '${path}': ${cause.message}`,
    );
  }
}

export const computeWatchPaths = async (
  ctx: StrategyContext,
  patterns: string[],
): Promise<StrategyResult> => {
  const resolved = await resolveAll(ctx, patterns);

  if (resolved.length === 0) {
    throw new EmptyWatchPathsError(patterns);
  }

  const watched: WatchedPath[] = await Promise.all(
    resolved.map(async ({ absolute, display }) => {
      try {
        const fileStat = await stat(absolute);
        return { path: display, mtime: fileStat.mtime.getTime() };
      } catch (error) {
        throw new WatchPathAccessError(display, error as Error);
      }
    }),
  );

  const newest = watched.reduce(
    (best, entry) => (entry.mtime > best.mtime ? entry : best),
    watched[0],
  );

  return {
    mtime: newest.mtime,
    reason: `strategy=watch-paths; newest=${newest.path}`,
    watched,
  };
};

const resolveAll = async (
  ctx: StrategyContext,
  patterns: string[],
): Promise<Array<{ absolute: string; display: string }>> => {
  const perPattern = await Promise.all(
    patterns.map(async (pattern) => {
      const isRootRelative = pattern.startsWith('/');
      const cwd = isRootRelative ? ctx.monorepoRoot : ctx.dockerContext;
      const innerPattern = isRootRelative ? pattern.slice(1) : pattern;

      const matches = await glob(innerPattern, {
        cwd,
        absolute: true,
        nodir: true,
      });

      return matches.map((absolute) => {
        const display = isRootRelative
          ? '/' + relative(ctx.monorepoRoot, absolute)
          : relative(ctx.dockerContext, absolute);
        return { absolute, display };
      });
    }),
  );

  const seen = new Set<string>();
  const all: Array<{ absolute: string; display: string }> = [];

  for (const entry of perPattern.flat()) {
    if (seen.has(entry.absolute)) {
      continue;
    }

    seen.add(entry.absolute);
    all.push(entry);
  }

  return all;
};
