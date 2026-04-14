import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import pMap from 'p-map';

import { GitPrerequisitePlugin } from '@/prerequisites';

import { StrategyContext, StrategyResult } from './types.js';

export const computeAuto = async (
  ctx: StrategyContext,
): Promise<StrategyResult | undefined> => {
  const plugin = new GitPrerequisitePlugin();
  const sources = await plugin.collect(ctx.dockerContext);

  if (sources.length === 0) {
    return undefined;
  }

  const stats = await pMap(
    sources,
    async (s) => {
      const fileStat = await stat(join(ctx.dockerContext, s.path));
      return { path: s.path, mtime: fileStat.mtime.getTime() };
    },
    { concurrency: 30 },
  );

  const newest = stats.reduce(
    (best, entry) => (entry.mtime > best.mtime ? entry : best),
    stats[0],
  );

  return {
    mtime: newest.mtime,
    reason: `strategy=auto; newest=${newest.path}`,
  };
};
