import {
  AmbiguousReferenceError,
  ItemCollisionsError,
  UnkownReferenceError,
} from '@/errors.js';

import { DepList } from './types.js';

export type CollectionConfig<
  IDK extends PropertyKey,
  DPK extends PropertyKey,
> = {
  idField: IDK;
  depField: DPK;
  /** If true, throw when an item's id equals some other item's name (or vice versa). */
  forbidIdNameCollision?: boolean;
};

export class EMBCollection<
  T extends Partial<Record<DPK, DepList>> &
    Record<IDK, string> & { name: string },
  IDK extends keyof T,
  DPK extends keyof T,
> {
  private items: T[];
  readonly idField: IDK;
  readonly depField: DPK;
  readonly forbidIdNameCollision: boolean;
  //
  private byId: Map<string, T>;
  private byName: Map<string, T[]>;

  constructor(items: Iterable<T>, cfg: CollectionConfig<IDK, DPK>) {
    this.items = [];
    this.idField = cfg.idField;
    this.depField = cfg.depField;
    this.forbidIdNameCollision = cfg.forbidIdNameCollision ?? true;

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
          `id \`${id}\` used by \`${firstOwner.name}\` and \`${name}\``,
        );
        // keep the first owner in byId; do not overwrite
      } else {
        this.byId.set(id, t);
        seenIds.add(id);
      }

      // --- Optional validation: forbid id <-> name collisions ---
      if (this.forbidIdNameCollision) {
        if (seenNames.has(id)) {
          const nameOwners = this.byName.get(id) ?? [];
          const ownerIds = nameOwners.map((o) => o[this.idField]).join(', ');
          collisions.push(
            `value \`${id}\` is an id of \`${name}\` and also a name of item(s) with id(s): [${ownerIds}]`,
          );
        }

        if (seenIds.has(name)) {
          const idOwner = this.byId.get(name)!;
          collisions.push(
            `value \`${name}\` is a name of \`${t.name}\` and also an id of \`${idOwner.name}\``,
          );
        }
      }

      // byName index
      const list = this.byName.get(name);
      if (list) {
        list.push(t);
      } else {
        this.byName.set(name, [t]);
      }

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

      throw new ItemCollisionsError('Collision between items', parts);
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
    if (idHit) {
      return opts?.multiple ? [idHit] : idHit;
    }

    const nameHits = this.byName.get(ref) ?? [];
    if (nameHits.length === 0) {
      throw new UnkownReferenceError(`Unknown reference \`${ref}\``, ref);
    }

    if (opts?.multiple) {
      return nameHits;
    }

    if (nameHits.length > 1) {
      const names = nameHits.map((t) => this.idOf(t));
      throw new AmbiguousReferenceError(
        `Ambiguous reference \`${ref}\` matches multiple names`,
        ref,
        names,
      );
    }

    return nameHits[0];
  }
}
