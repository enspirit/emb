import graphlib from 'graphlib';

import {
  AmbiguousReferenceError,
  CircularDependencyError,
  UnkownReferenceError,
} from '@/errors.js';

import { EMBCollection } from './EMBCollection.js';
import { AmbiguityPolicy, DepList } from './types.js';

export function resolveRefSet<
  T extends Partial<Record<DPK, DepList>> &
    Record<IDK, string> & { name: string },
  IDK extends keyof T,
  DPK extends keyof T,
>(
  col: EMBCollection<T, IDK, DPK>,
  ref: string,
  policy: AmbiguityPolicy,
): string[] {
  if (policy === 'runAll') {
    return col.matches(ref, { multiple: true }).map((t) => col.idOf(t));
  }

  return [col.idOf(col.matches(ref))];
}

/**
 * Resolves one entry of `owner`'s dependency list. Dependencies are always
 * resolved strictly: an ambiguous name is an error (the `runAll` policy only
 * ever applies to the user's selection), and errors name the item holding
 * the bad reference.
 */
export function resolveDepRef<
  T extends Partial<Record<DPK, DepList>> &
    Record<IDK, string> & { name: string },
  IDK extends keyof T,
  DPK extends keyof T,
>(col: EMBCollection<T, IDK, DPK>, owner: string, ref: string): string[] {
  try {
    return resolveRefSet(col, ref, 'error');
  } catch (error) {
    if (error instanceof AmbiguousReferenceError) {
      throw new AmbiguousReferenceError(
        `\`${owner}\` depends on ambiguous reference \`${ref}\` (matches: ${error.matches.join(', ')})`,
        ref,
        error.matches,
        owner,
      );
    }

    if (error instanceof UnkownReferenceError) {
      throw new UnkownReferenceError(
        `\`${owner}\` depends on unknown reference \`${ref}\``,
        ref,
        owner,
      );
    }

    throw error;
  }
}

export function buildGraph<
  T extends Partial<Record<DPK, DepList>> &
    Record<IDK, string> & { name: string },
  IDK extends keyof T,
  DPK extends keyof T,
>(col: EMBCollection<T, IDK, DPK>): graphlib.Graph {
  const g = new graphlib.Graph({ directed: true });
  for (const t of col.all) {
    g.setNode(col.idOf(t));
  }

  for (const t of col.all) {
    const toId = col.idOf(t);
    for (const ref of col.depsOf(t)) {
      for (const fromId of resolveDepRef(col, toId, ref)) {
        g.setEdge(fromId, toId);
      }
    }
  }

  return g;
}

interface RunSubgraph<T> {
  byId: Map<string, T>;
  ids: string[];
  sub: graphlib.Graph;
}

/**
 * Shared machinery behind findRunOrder/findRunGraph: resolve the selection,
 * walk its dependencies transitively (only the items actually reached are
 * resolved, so a broken reference elsewhere in the collection is harmless),
 * reject cycles, and return the closure subgraph topsorted (ids), an
 * id->item lookup, and the subgraph itself (so callers can read per-node
 * edges).
 */
function resolveRunSubgraph<
  T extends Partial<Record<DPK, DepList>> &
    Record<IDK, string> & { name: string },
  IDK extends keyof T,
  DPK extends keyof T,
>(
  selection: readonly string[],
  collection: EMBCollection<T, IDK, DPK>,
  onAmbiguous: AmbiguityPolicy,
): RunSubgraph<T> {
  const byId = new Map<string, T>();
  for (const t of collection.all) {
    byId.set(collection.idOf(t), t);
  }

  const selectedIds = new Set<string>();
  for (const ref of selection) {
    for (const id of resolveRefSet(collection, ref, onAmbiguous)) {
      selectedIds.add(id);
    }
  }

  if (selectedIds.size === 0) {
    throw new Error('Selection resolved to no items.');
  }

  const sub = new graphlib.Graph({ directed: true });
  const queue = [...selectedIds];
  for (const id of queue) {
    sub.setNode(id);
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const ref of collection.depsOf(byId.get(id)!)) {
      for (const depId of resolveDepRef(collection, id, ref)) {
        if (!sub.hasNode(depId)) {
          sub.setNode(depId);
          queue.push(depId);
        }

        sub.setEdge(depId, id);
      }
    }
  }

  const cycles = graphlib.alg.findCycles(sub);
  if (cycles.length > 0) {
    throw new CircularDependencyError(
      `Circular dependencies detected: ${JSON.stringify(cycles)}`,
      cycles,
    );
  }

  const ids = graphlib.alg.topsort(sub);
  return { ids, byId, sub };
}

function itemsFor<T>(ids: string[], byId: Map<string, T>): T[] {
  return ids.map((id) => {
    const t = byId.get(id);
    if (!t) {
      throw new Error(`Internal error: missing item for id "${id}"`);
    }

    return t;
  });
}

export function findRunOrder<
  T extends Partial<Record<DPK, DepList>> &
    Record<IDK, string> & { name: string },
  IDK extends keyof T,
  DPK extends keyof T,
>(
  selection: readonly string[],
  collection: EMBCollection<T, IDK, DPK>,
  { onAmbiguous = 'error' as AmbiguityPolicy } = {},
): T[] {
  const { ids, byId } = resolveRunSubgraph(selection, collection, onAmbiguous);
  return itemsFor(ids, byId);
}

/**
 * The dependency graph of a selection: the same topsorted predecessor closure
 * `findRunOrder` returns, plus each node's DIRECT dependency ids (within the
 * closure). This is what a dependency-aware scheduler (runGraph) needs.
 */
export interface RunGraphPlan<T> {
  /** id -> its direct dependency ids, restricted to the closure. */
  dependencies: Map<string, string[]>;
  /** Closure items, topologically ordered (dependencies before dependents). */
  nodes: T[];
}

export function findRunGraph<
  T extends Partial<Record<DPK, DepList>> &
    Record<IDK, string> & { name: string },
  IDK extends keyof T,
  DPK extends keyof T,
>(
  selection: readonly string[],
  collection: EMBCollection<T, IDK, DPK>,
  { onAmbiguous = 'error' as AmbiguityPolicy } = {},
): RunGraphPlan<T> {
  const { ids, byId, sub } = resolveRunSubgraph(
    selection,
    collection,
    onAmbiguous,
  );

  const dependencies = new Map<string, string[]>();
  for (const id of ids) {
    dependencies.set(id, sub.predecessors(id) ?? []);
  }

  return { nodes: itemsFor(ids, byId), dependencies };
}
