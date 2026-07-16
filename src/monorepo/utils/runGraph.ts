export type RunGraphStatus = 'failed' | 'skipped' | 'succeeded';

export interface RunGraphResult<V> {
  /** Present when status is 'failed'. */
  error?: unknown;
  /**
   * Present when status is 'skipped'. Either the id of the failed dependency
   * that caused the skip (keep-going mode), or 'aborted' when a different node
   * failed under fail-fast.
   */
  reason?: string;
  status: RunGraphStatus;
  /** Present when status is 'succeeded'. */
  value?: V;
}

export interface RunGraphOptions<V = unknown> {
  /** Maximum number of workers running at once (clamped to >= 1). */
  concurrency: number;
  /**
   * When false (default): the first failure stops admitting new nodes; nodes
   * already running are allowed to finish, and any not-yet-started node is
   * skipped ('aborted'). When true: keep running everything still reachable;
   * only the transitive dependents of a failed node are skipped.
   */
  keepGoing?: boolean;
  /**
   * Called exactly once for each node when it reaches a terminal state
   * (succeeded / failed / skipped), as it happens. Lets callers react to
   * skips they never scheduled a worker for (e.g. mark a UI task skipped).
   */
  onSettle?: (id: string, result: RunGraphResult<V>) => void;
}

/**
 * Runs `worker` over a set of nodes that form a dependency DAG, honouring:
 *
 *  - **Ordering:** a node is admitted only once ALL of its dependencies have
 *    succeeded — a strict happens-before barrier per dependency edge.
 *  - **Concurrency:** at most `concurrency` workers run at once; independent
 *    nodes run in parallel.
 *  - **Failure:** see {@link RunGraphOptions.keepGoing}.
 *
 * Resolves with a per-node result map (it never rejects on a worker failure —
 * the caller inspects the map). It DOES reject if the graph cannot make
 * progress (a cycle or a dependency on an unknown node), which
 * dependency-closed acyclic input never triggers.
 */
export const runGraph = async <V>(
  nodes: string[],
  dependenciesOf: (id: string) => string[],
  worker: (id: string) => Promise<V>,
  options: RunGraphOptions<V>,
): Promise<Map<string, RunGraphResult<V>>> => {
  const concurrency = Math.max(1, Math.floor(options.concurrency));
  const keepGoing = options.keepGoing ?? false;

  const results = new Map<string, RunGraphResult<V>>();
  const pending = new Set(nodes);

  const settle = (id: string, result: RunGraphResult<V>) => {
    results.set(id, result);
    options.onSettle?.(id, result);
  };

  // Reverse edges (id -> ids that depend on it), used to cascade skips.
  const dependentsOf = new Map<string, string[]>();
  for (const id of nodes) {
    for (const dep of dependenciesOf(id)) {
      const list = dependentsOf.get(dep) ?? [];
      list.push(id);
      dependentsOf.set(dep, list);
    }
  }

  let inFlight = 0;
  let aborting = false; // set once a failure triggers fail-fast

  const isReady = (id: string): boolean =>
    dependenciesOf(id).every((dep) => results.get(dep)?.status === 'succeeded');

  const markSkipped = (id: string, reason: string) => {
    if (!pending.delete(id)) {
      return;
    }

    settle(id, { status: 'skipped', reason });
  };

  // Mark every transitive dependent of a failed node as skipped.
  const skipDependents = (failedId: string) => {
    const stack = [...(dependentsOf.get(failedId) ?? [])];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (!pending.has(id)) {
        continue;
      }

      markSkipped(id, failedId);
      stack.push(...(dependentsOf.get(id) ?? []));
    }
  };

  return new Promise((resolve, reject) => {
    const pump = () => {
      // Fail-fast: stop admitting; once in-flight drains, skip the rest.
      if (aborting) {
        if (inFlight === 0) {
          for (const id of pending) {
            markSkipped(id, 'aborted');
          }

          resolve(results);
        }

        return;
      }

      if (inFlight === 0 && pending.size === 0) {
        resolve(results);
        return;
      }

      let admitted = false;
      for (const id of nodes) {
        if (inFlight >= concurrency) {
          break;
        }

        if (!pending.has(id) || !isReady(id)) {
          continue;
        }

        pending.delete(id);
        inFlight += 1;
        admitted = true;

        Promise.resolve()
          .then(() => worker(id))
          .then(
            (value) => {
              settle(id, { status: 'succeeded', value });
            },
            (error) => {
              settle(id, { status: 'failed', error });
              if (keepGoing) {
                skipDependents(id);
              } else {
                aborting = true;
              }
            },
          )
          .finally(() => {
            inFlight -= 1;
            pump();
          });
      }

      // No node is running and none could be admitted, yet work remains: the
      // remaining nodes depend on something that will never succeed.
      if (!admitted && inFlight === 0 && pending.size > 0) {
        reject(
          new Error(
            `runGraph: cannot make progress — ${pending.size} node(s) have ` +
              `unsatisfiable dependencies or form a cycle: ${[...pending].join(', ')}`,
          ),
        );
      }
    };

    pump();
  });
};
