import graphlib from 'graphlib';

import {
  AmbiguousTaskError,
  CircularDependencyError,
  TaskNameCollisionError,
  UnkownReferenceError,
} from '@/errors.js';

type DepList = readonly string[] | string[] | undefined;

type CollectionConfig<IDK extends PropertyKey, DPK extends PropertyKey> = {
  idField: IDK;
  depField: DPK;
  /** If true, throw when an item's id equals some other item's name (or vice versa). */
  forbidIdNameCollision?: boolean;
};

type AmbiguityPolicy = 'error' | 'runAll';

export class EMBCollection<
  T extends Partial<Record<DPK, DepList>> &
    Record<IDK, string> & { name: string },
  IDK extends keyof T,
  DPK extends keyof T,
> {
  private items: T[];
  readonly idField: IDK;
  readonly depField: DPK;
  private byId: Map<string, T>;
  private byName: Map<string, T[]>;

  constructor(items: Iterable<T>, cfg: CollectionConfig<IDK, DPK>) {
    this.items = [];
    this.idField = cfg.idField;
    this.depField = cfg.depField;

    this.byId = new Map<string, T>();
    this.byName = new Map<string, T[]>();

    // single-pass validation state
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const dupIdReports: string[] = [];
    const collisions: string[] = [];

    for (const t of items) {
      const id = t[this.idField];
      const { name } = t;

      // duplicate id?
      if (seenIds.has(id)) {
        const firstOwner = this.byId.get(id)!; // first occurrence already stored
        dupIdReports.push(
          `id "${id}" used by "${firstOwner.name}" and "${name}"`,
        );
        // keep the first owner in byId; do not overwrite
      } else {
        this.byId.set(id, t);
        seenIds.add(id);
      }

      // --- Optional validation: forbid id <-> name collisions ---
      const checkCollisions =
        cfg.forbidIdNameCollision && this.idField !== ('name' as IDK);

      if (checkCollisions) {
        if (seenNames.has(id)) {
          const nameOwners = this.byName.get(id) ?? [];
          const ownerIds = nameOwners.map((o) => o[this.idField]).join(', ');
          collisions.push(
            `value "${id}" is an id of "${name}" and also a name of item(s) with id(s): [${ownerIds}]`,
          );
        }

        if (seenIds.has(name)) {
          const idOwner = this.byId.get(name)!;
          collisions.push(
            `value "${name}" is a name of "${t.name}" and also an id of "${idOwner.name}"`,
          );
        }
      }

      // byName index
      const list = this.byName.get(name);
      if (list) list.push(t);
      else this.byName.set(name, [t]);

      // keep item list (stable order)
      this.items.push(t);

      // record name after checks so current name won’t collide with itself
      seenNames.add(name);
    }

    if (dupIdReports.length > 0 || collisions.length > 0) {
      const parts: string[] = [];
      if (dupIdReports.length > 0) {
        parts.push(
          `Duplicate ${String(this.idField)} values (${dupIdReports.length}):\n` +
            dupIdReports.join('\n'),
        );
      }

      if (collisions.length > 0) {
        parts.push(
          `id↔name collisions (${collisions.length}):\n` +
            collisions.join('\n'),
        );
      }

      throw new TaskNameCollisionError(
        'Collision between task names and ids',
        parts,
      );
    }
  }

  /** All items (stable array iteration) */
  get all(): Iterable<T> {
    return this.items;
  }

  idOf(t: T): string {
    return t[this.idField];
  }

  depsOf(t: T): readonly string[] {
    return (t[this.depField] ?? []) as readonly string[];
  }

  matches(ref: string, opts?: { multiple?: false }): T;
  matches(ref: string, opts: { multiple: true }): T[];
  matches(ref: string, opts?: { multiple?: boolean }): T | T[] {
    const idHit = this.byId.get(ref);
    if (idHit) return opts?.multiple ? [idHit] : idHit;

    const nameHits = this.byName.get(ref) ?? [];
    if (nameHits.length === 0) {
      throw new UnkownReferenceError(`Unknown reference "${ref}"`);
    }

    if (opts?.multiple) return nameHits;
    if (nameHits.length > 1) {
      const ids = nameHits.map((t) => this.idOf(t));
      throw new AmbiguousTaskError(
        `Ambiguous reference "${ref}" matches multiple id/name`,
        ids,
      );
    }

    return nameHits[0];
  }
}

/* ----------------- run-order helpers unchanged (for completeness) ---------------- */

function resolveRefSet<
  T extends Partial<Record<DPK, DepList>> &
    Record<IDK, string> & { name: string },
  IDK extends keyof T,
  DPK extends keyof T,
>(
  col: EMBCollection<T, IDK, DPK>,
  ref: string,
  policy: AmbiguityPolicy,
): string[] {
  if (policy === 'runAll')
    return col.matches(ref, { multiple: true }).map((t) => col.idOf(t));
  return [col.idOf(col.matches(ref))];
}

function collectPredecessorClosure(
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
    for (const p of g.predecessors(cur) ?? [])
      if (!seen.has(p)) {
        seen.add(p);
        q.push(p);
      }
  }

  return seen;
}

function buildGraph<
  T extends Partial<Record<DPK, DepList>> &
    Record<IDK, string> & { name: string },
  IDK extends keyof T,
  DPK extends keyof T,
>(col: EMBCollection<T, IDK, DPK>, policy: AmbiguityPolicy): graphlib.Graph {
  const g = new graphlib.Graph({ directed: true });
  for (const t of col.all) g.setNode(col.idOf(t));
  for (const t of col.all) {
    const toId = col.idOf(t);
    for (const ref of col.depsOf(t)) {
      for (const fromId of resolveRefSet(col, ref, policy))
        g.setEdge(fromId, toId);
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
    );
  }

  const selectedIds = new Set<string>();
  for (const ref of selection)
    for (const id of resolveRefSet(collection, ref, onAmbiguous))
      selectedIds.add(id);
  if (selectedIds.size === 0)
    throw new Error('Selection resolved to no items.');

  const include = collectPredecessorClosure(g, selectedIds.values());

  const sub = new graphlib.Graph({ directed: true });
  for (const id of include) sub.setNode(id);
  for (const id of include)
    for (const p of g.predecessors(id) ?? [])
      if (include.has(p)) sub.setEdge(p, id);

  const ids = graphlib.alg.topsort(sub);
  const byId = new Map<string, T>();
  for (const t of collection.all) byId.set(collection.idOf(t), t);
  return ids.map((id) => {
    const t = byId.get(id);
    if (!t) throw new Error(`Internal error: missing item for id "${id}"`);
    return t;
  });
}
