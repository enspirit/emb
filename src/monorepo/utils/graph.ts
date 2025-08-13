import graphlib from 'graphlib';

import { CircularDependencyError } from '@/errors.js';

import { EMBCollection } from './EMBCollection.js';
import { AmbiguityPolicy, DepList } from './types.js';

/* ----------------- run-order helpers unchanged (for completeness) ---------------- */

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

export function collectPredecessorClosure(
  g: graphlib.Graph,
  seeds: Iterable<string>,
): Set<string> {
  const seen = new Set<string>();
  const q: string[] = [];
  for (const s of seeds) {
    if (!seen.has(s)) {
      seen.add(s);
      q.push(s);
    }
  }

  while (q.length > 0) {
    const cur = q.shift()!;
    for (const p of g.predecessors(cur) ?? []) {
      if (!seen.has(p)) {
        seen.add(p);
        q.push(p);
      }
    }
  }

  return seen;
}

export function buildGraph<
  T extends Partial<Record<DPK, DepList>> &
    Record<IDK, string> & { name: string },
  IDK extends keyof T,
  DPK extends keyof T,
>(col: EMBCollection<T, IDK, DPK>, policy: AmbiguityPolicy): graphlib.Graph {
  const g = new graphlib.Graph({ directed: true });
  for (const t of col.all) {
    g.setNode(col.idOf(t));
  }

  for (const t of col.all) {
    const toId = col.idOf(t);
    for (const ref of col.depsOf(t)) {
      for (const fromId of resolveRefSet(col, ref, policy)) {
        g.setEdge(fromId, toId);
      }
    }
  }

  return g;
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
  const g = buildGraph(collection, onAmbiguous);

  const cycles = graphlib.alg.findCycles(g);
  if (cycles.length > 0) {
    throw new CircularDependencyError(
      `Circular dependencies detected: ${JSON.stringify(cycles)}`,
      cycles,
    );
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

  const include = collectPredecessorClosure(g, selectedIds.values());

  const sub = new graphlib.Graph({ directed: true });
  for (const id of include) {
    sub.setNode(id);
  }

  for (const id of include) {
    for (const p of g.predecessors(id) ?? []) {
      if (include.has(p)) {
        sub.setEdge(p, id);
      }
    }
  }

  const ids = graphlib.alg.topsort(sub);
  const byId = new Map<string, T>();
  for (const t of collection.all) {
    byId.set(collection.idOf(t), t);
  }

  return ids.map((id) => {
    const t = byId.get(id);
    if (!t) {
      throw new Error(`Internal error: missing item for id "${id}"`);
    }

    return t;
  });
}
