import { describe, expect, test } from 'vitest';

import { RebuildTriggerConfig } from '../../../../src/config/schema.js';
import { resolveRebuildTrigger } from '../../../../src/docker/resources/resolveRebuildTrigger.js';

describe('Docker / resolveRebuildTrigger', () => {
  test('it returns the builtin auto default when no inputs are provided', () => {
    const result = resolveRebuildTrigger();

    expect(result).toEqual({ strategy: 'auto', source: 'builtin' });
  });

  test('it returns the builtin default when both inputs are absent', () => {
    const result = resolveRebuildTrigger({});

    expect(result).toEqual({ strategy: 'auto', source: 'builtin' });
  });

  test('it returns the flavor default when only the flavor input is set', () => {
    const flavor: RebuildTriggerConfig = {
      strategy: 'watch-paths',
      paths: ['Dockerfile', '/pnpm-lock.yaml'],
    };

    const result = resolveRebuildTrigger({ flavor });

    expect(result).toEqual({
      strategy: 'watch-paths',
      paths: ['Dockerfile', '/pnpm-lock.yaml'],
      source: 'flavor',
    });
  });

  test('it returns the resource trigger when only the resource input is set', () => {
    const resource: RebuildTriggerConfig = { strategy: 'always' };

    const result = resolveRebuildTrigger({ resource });

    expect(result).toEqual({ strategy: 'always', source: 'resource' });
  });

  test('it prefers the resource trigger when both inputs are set', () => {
    const resource: RebuildTriggerConfig = {
      strategy: 'watch-paths',
      paths: ['Dockerfile'],
    };
    const flavor: RebuildTriggerConfig = { strategy: 'always' };

    const result = resolveRebuildTrigger({ resource, flavor });

    expect(result).toEqual({
      strategy: 'watch-paths',
      paths: ['Dockerfile'],
      source: 'resource',
    });
  });

  test('it reports each source correctly based on which input wins', () => {
    expect(resolveRebuildTrigger().source).toBe('builtin');
    expect(
      resolveRebuildTrigger({ resource: { strategy: 'auto' } }).source,
    ).toBe('resource');
    expect(resolveRebuildTrigger({ flavor: { strategy: 'auto' } }).source).toBe(
      'flavor',
    );
  });

  test('it does not mutate the provided resource trigger', () => {
    const resource: RebuildTriggerConfig = {
      strategy: 'watch-paths',
      paths: ['Dockerfile'],
    };
    const snapshot = structuredClone(resource);

    resolveRebuildTrigger({ resource });

    expect(resource).toEqual(snapshot);
  });

  test('it does not mutate the provided flavor default', () => {
    const flavor: RebuildTriggerConfig = {
      strategy: 'watch-paths',
      paths: ['Dockerfile'],
    };
    const snapshot = structuredClone(flavor);

    resolveRebuildTrigger({ flavor });

    expect(flavor).toEqual(snapshot);
  });

  test('it returns a new object, not the input reference', () => {
    const resource: RebuildTriggerConfig = { strategy: 'always' };

    const result = resolveRebuildTrigger({ resource });

    expect(result).not.toBe(resource);
  });
});
