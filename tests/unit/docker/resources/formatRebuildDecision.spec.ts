import { describe, expect, test } from 'vitest';

import {
  DockerImageSentinel,
  formatRebuildDecision,
} from '../../../../src/docker/resources/formatRebuildDecision.js';

const autoSentinel: DockerImageSentinel = {
  mtime: 1_700_000_000_000,
  strategy: 'auto',
  source: 'builtin',
  reason: 'strategy=auto; newest=Dockerfile',
};

const alwaysSentinel: DockerImageSentinel = {
  mtime: 1_700_000_000_000,
  strategy: 'always',
  source: 'resource',
  reason: 'strategy=always',
};

const watchPathsSentinel: DockerImageSentinel = {
  mtime: 1_700_000_010_000,
  strategy: 'watch-paths',
  source: 'resource',
  reason: 'strategy=watch-paths; newest=Dockerfile',
  watched: [
    { path: 'Dockerfile', mtime: 1_700_000_010_000 },
    { path: '/pnpm-lock.yaml', mtime: 1_700_000_000_000 },
  ],
};

describe('Docker / formatRebuildDecision', () => {
  test('it emits no lines for an auto rebuild (keeps default UX compact)', () => {
    const lines = formatRebuildDecision({
      resourceId: 'api:image',
      sentinelData: autoSentinel,
      cacheHit: false,
      force: false,
    });

    expect(lines).toEqual([]);
  });

  test('it emits no lines when the sentinel has an unknown shape', () => {
    const lines = formatRebuildDecision({
      resourceId: 'api:image',
      sentinelData: { foo: 'bar' },
      cacheHit: false,
      force: false,
    });

    expect(lines).toEqual([]);
  });

  test('it emits no lines when sentinelData is undefined (cache hit for auto)', () => {
    const lines = formatRebuildDecision({
      resourceId: 'api:image',
      sentinelData: undefined,
      cacheHit: true,
      force: false,
    });

    expect(lines).toEqual([]);
  });

  test('it summarizes an always rebuild', () => {
    const lines = formatRebuildDecision({
      resourceId: 'api:image',
      sentinelData: alwaysSentinel,
      cacheHit: false,
      force: false,
    });

    expect(lines).toMatchInlineSnapshot(`
      [
        "strategy=always source=resource",
        "reason: strategy=always",
        "decision: rebuild",
      ]
    `);
  });

  test('it summarizes a watch-paths rebuild with the full watched list', () => {
    const lines = formatRebuildDecision({
      resourceId: 'api:image',
      sentinelData: watchPathsSentinel,
      cacheHit: false,
      force: false,
    });

    expect(lines).toMatchInlineSnapshot(`
      [
        "strategy=watch-paths source=resource",
        "reason: strategy=watch-paths; newest=Dockerfile",
        "watched:",
        "  Dockerfile @ 2023-11-14T22:13:30.000Z",
        "  /pnpm-lock.yaml @ 2023-11-14T22:13:20.000Z",
        "decision: rebuild",
      ]
    `);
  });

  test('it reports "forced rebuild" when force is set, regardless of strategy', () => {
    const lines = formatRebuildDecision({
      resourceId: 'api:image',
      sentinelData: autoSentinel,
      cacheHit: false,
      force: true,
    });

    expect(lines).toMatchInlineSnapshot(`
      [
        "strategy=auto source=builtin",
        "reason: strategy=auto; newest=Dockerfile",
        "decision: forced rebuild",
      ]
    `);
  });
});
