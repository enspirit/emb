import deepMerge from '@fastify/deepmerge';

import {
  ComponentFlavorConfig,
  JsonPatchOperation,
  ProjectFlavorConfig,
} from '@/config/schema.js';
import { CircularDependencyError, UnkownReferenceError } from '@/errors.js';

type FlavorLike = {
  extends?: string;
  patches?: JsonPatchOperation[];
};

function buildChain<T extends FlavorLike>(
  flavors: Record<string, T>,
  name: string,
  subject: string,
): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  let current: string | undefined = name;

  while (current !== undefined) {
    if (visited.has(current)) {
      const cycle = [...chain, current].join(' -> ');
      throw new CircularDependencyError(
        `Circular ${subject} inheritance detected: ${cycle}`,
        [[...chain, current]],
      );
    }

    const config: T | undefined = flavors[current];

    if (!config) {
      if (chain.length === 0) {
        throw new UnkownReferenceError(
          `Unknown ${subject}: ${current}`,
          current,
        );
      }

      const parent = chain.at(-1);
      throw new UnkownReferenceError(
        `Unknown parent ${subject}: '${current}' (extended from '${parent}')`,
        current,
      );
    }

    visited.add(current);
    chain.push(current);
    current = config.extends;
  }

  return chain.reverse();
}

export function resolveProjectFlavor(
  flavors: Record<string, ProjectFlavorConfig>,
  name: string,
): ProjectFlavorConfig {
  const chain = buildChain(flavors, name, 'flavor');
  const patches: JsonPatchOperation[] = [];
  let defaults: ProjectFlavorConfig['defaults'] | undefined;
  const merge = deepMerge();

  for (const flavorName of chain) {
    const f = flavors[flavorName];
    if (f.patches) {
      patches.push(...f.patches);
    }

    if (f.defaults) {
      defaults = defaults
        ? (merge(defaults, f.defaults) as ProjectFlavorConfig['defaults'])
        : f.defaults;
    }
  }

  const resolved: ProjectFlavorConfig = {};
  if (patches.length > 0) {
    resolved.patches = patches;
  }

  if (defaults) {
    resolved.defaults = defaults;
  }

  return resolved;
}

export function resolveComponentFlavor(
  flavors: Record<string, ComponentFlavorConfig>,
  name: string,
): ComponentFlavorConfig {
  const chain = buildChain(flavors, name, 'component flavor');
  const patches: JsonPatchOperation[] = [];

  for (const flavorName of chain) {
    const f = flavors[flavorName];
    if (f.patches) {
      patches.push(...f.patches);
    }
  }

  const resolved: ComponentFlavorConfig = {};
  if (patches.length > 0) {
    resolved.patches = patches;
  }

  return resolved;
}
