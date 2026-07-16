import { runGraph } from '@';
import { describe, expect, test } from 'vitest';

// Let all pending microtasks/timers settle so the scheduler has admitted /
// completed everything it can before we assert.
const flush = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

interface Deferred<T> {
  promise: Promise<T>;
  reject: (error?: unknown) => void;
  resolve: (value: T) => void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/**
 * Test harness: each node's worker records a `start:<id>` event, then blocks on
 * a per-node gate the test controls, then records `end:<id>` and resolves.
 * Rejecting a gate makes that node's worker reject. This gives fully
 * deterministic control over ordering and concurrency.
 */
const makeHarness = (ids: string[]) => {
  const events: string[] = [];
  const gates = new Map<string, Deferred<void>>();
  let running = 0;
  let maxRunning = 0;

  for (const id of ids) {
    gates.set(id, deferred<void>());
  }

  const worker = async (id: string): Promise<string> => {
    events.push(`start:${id}`);
    running += 1;
    maxRunning = Math.max(maxRunning, running);
    try {
      await gates.get(id)!.promise;
      events.push(`end:${id}`);
      return id;
    } finally {
      running -= 1;
    }
  };

  const started = (): Array<string> =>
    events
      .filter((e) => e.startsWith('start:'))
      .map((e) => e.slice('start:'.length));

  return {
    events,
    gates,
    worker,
    started,
    get maxRunning() {
      return maxRunning;
    },
  };
};

const noDeps = () => [];

describe('runGraph', () => {
  test('runs every node and returns its worker result value', async () => {
    const result = await runGraph(
      ['a', 'b', 'c'],
      noDeps,
      async (id) => `built:${id}`,
      { concurrency: 2 },
    );

    expect([...result.keys()].sort()).toEqual(['a', 'b', 'c']);
    expect(result.get('a')).toEqual({ status: 'succeeded', value: 'built:a' });
    expect(result.get('b')?.status).toBe('succeeded');
    expect(result.get('c')?.value).toBe('built:c');
  });

  test('returns an empty map when there are no nodes', async () => {
    const result = await runGraph([], noDeps, async () => 'x', {
      concurrency: 2,
    });
    expect(result.size).toBe(0);
  });

  test('never starts a node before all its dependencies have finished', async () => {
    const deps: Record<string, string[]> = { a: [], b: ['a'], c: ['b'] };
    const h = makeHarness(['a', 'b', 'c']);

    const done = runGraph(['a', 'b', 'c'], (id) => deps[id], h.worker, {
      concurrency: 3,
    });

    await flush();
    expect(h.events).toEqual(['start:a']);

    h.gates.get('a')!.resolve();
    await flush();
    expect(h.events).toEqual(['start:a', 'end:a', 'start:b']);

    h.gates.get('b')!.resolve();
    await flush();
    expect(h.events).toEqual([
      'start:a',
      'end:a',
      'start:b',
      'end:b',
      'start:c',
    ]);

    h.gates.get('c')!.resolve();
    await done;
  });

  test('waits for every dependency in a diamond graph', async () => {
    const deps: Record<string, string[]> = {
      a: [],
      b: ['a'],
      c: ['a'],
      d: ['b', 'c'],
    };
    const h = makeHarness(['a', 'b', 'c', 'd']);

    const done = runGraph(['a', 'b', 'c', 'd'], (id) => deps[id], h.worker, {
      concurrency: 4,
    });

    await flush();
    expect(h.started()).toEqual(['a']);

    h.gates.get('a')!.resolve();
    await flush();
    expect(h.started().sort()).toEqual(['a', 'b', 'c']);

    h.gates.get('b')!.resolve();
    await flush();
    // d still needs c
    expect(h.started()).not.toContain('d');

    h.gates.get('c')!.resolve();
    await flush();
    expect(h.started()).toContain('d');

    h.gates.get('d')!.resolve();
    await done;
  });

  test('never runs more than `concurrency` workers at once', async () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const h = makeHarness(ids);

    const done = runGraph(ids, noDeps, h.worker, { concurrency: 2 });

    await flush();
    expect(h.started()).toHaveLength(2);

    h.gates.get('a')!.resolve();
    await flush();
    expect(h.started()).toHaveLength(3);

    for (const id of ids) {
      h.gates.get(id)!.resolve();
    }

    await done;
    expect(h.maxRunning).toBeLessThanOrEqual(2);
  });

  test('runs independent nodes concurrently up to the limit', async () => {
    const ids = ['a', 'b', 'c'];
    const h = makeHarness(ids);

    const done = runGraph(ids, noDeps, h.worker, { concurrency: 3 });

    await flush();
    expect(h.started()).toHaveLength(3);

    for (const id of ids) {
      h.gates.get(id)!.resolve();
    }

    await done;
  });

  test('concurrency 1 runs strictly serially', async () => {
    const ids = ['a', 'b', 'c'];
    const h = makeHarness(ids);

    const done = runGraph(ids, noDeps, h.worker, { concurrency: 1 });

    await flush();
    expect(h.started()).toEqual(['a']);

    h.gates.get('a')!.resolve();
    await flush();
    expect(h.started()).toEqual(['a', 'b']);

    h.gates.get('b')!.resolve();
    await flush();
    h.gates.get('c')!.resolve();
    await done;

    expect(h.maxRunning).toBe(1);
  });

  test('keepGoing: a failed node skips its transitive dependents while independent nodes continue', async () => {
    const deps: Record<string, string[]> = {
      a: [],
      b: ['a'],
      c: ['b'],
      x: [],
    };
    const h = makeHarness(['a', 'b', 'c', 'x']);

    const done = runGraph(['a', 'b', 'c', 'x'], (id) => deps[id], h.worker, {
      concurrency: 4,
      keepGoing: true,
    });

    await flush();
    expect(h.started().sort()).toEqual(['a', 'x']);

    h.gates.get('a')!.reject(new Error('boom'));
    await flush();
    h.gates.get('x')!.resolve();

    const result = await done;
    expect(result.get('a')?.status).toBe('failed');
    expect(result.get('b')?.status).toBe('skipped');
    expect(result.get('b')?.reason).toBe('a');
    expect(result.get('c')?.status).toBe('skipped'); // transitive
    expect(result.get('x')?.status).toBe('succeeded');
  });

  test('fail-fast (default): first failure aborts, in-flight nodes finish, unstarted are skipped', async () => {
    const deps: Record<string, string[]> = { a: [], b: ['a'], x: [] };
    const h = makeHarness(['a', 'b', 'x']);

    const done = runGraph(['a', 'b', 'x'], (id) => deps[id], h.worker, {
      concurrency: 4,
    });

    await flush();
    expect(h.started().sort()).toEqual(['a', 'x']);

    h.gates.get('a')!.reject(new Error('boom'));
    await flush();
    h.gates.get('x')!.resolve(); // in-flight node is allowed to finish

    const result = await done;
    expect(result.get('a')?.status).toBe('failed');
    expect(result.get('x')?.status).toBe('succeeded');
    expect(result.get('b')?.status).toBe('skipped');
    expect(result.get('b')?.reason).toBe('aborted');
    expect(h.started()).not.toContain('b');
  });

  test('rejects when a dependency can never be satisfied (missing node or cycle)', async () => {
    await expect(
      runGraph(
        ['a'],
        () => ['missing'],
        async () => 'x',
        { concurrency: 2 },
      ),
    ).rejects.toThrow(/progress|cycle|unsatisf/i);
  });
});
