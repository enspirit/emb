import { isDockerImageSentinel } from './DockerImageResource.js';

export { type DockerImageSentinel } from './DockerImageResource.js';

export type RebuildDecisionInput = {
  resourceId: string;
  sentinelData: unknown;
  cacheHit: boolean;
  force: boolean;
};

export const formatRebuildDecision = (
  input: RebuildDecisionInput,
): string[] => {
  if (!isDockerImageSentinel(input.sentinelData)) {
    return [];
  }

  const sentinel = input.sentinelData;

  if (sentinel.strategy === 'auto' && !input.force) {
    return [];
  }

  const lines: string[] = [
    `strategy=${sentinel.strategy} source=${sentinel.source}`,
    `reason: ${sentinel.reason}`,
  ];

  if (sentinel.watched && sentinel.watched.length > 0) {
    lines.push('watched:');
    for (const w of sentinel.watched) {
      lines.push(`  ${w.path} @ ${new Date(w.mtime).toISOString()}`);
    }
  }

  if (input.force) {
    lines.push('decision: forced rebuild');
  } else if (input.cacheHit) {
    lines.push('decision: cache hit (skip)');
  } else {
    lines.push('decision: rebuild');
  }

  return lines;
};
