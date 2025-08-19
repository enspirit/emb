import { ComponentIdentifiable, MaybeComponentIdentifiable } from '@';

export * from './EMBCollection.js';
export * from './graph.js';
export * from './types.js';

// Alternative signatures
export function toIdentifedHash<V, T extends Record<string, V>>(
  hash: T,
  parentName: string,
): { [K in keyof T]: ComponentIdentifiable<T[K]> };

export function toIdentifedHash<V, T extends Record<string, V>>(
  hash: T,
  parentName?: undefined,
): { [K in keyof T]: MaybeComponentIdentifiable<T[K]> };

// implementation
export function toIdentifedHash<V, T extends Record<string, V>>(
  hash: T,
  parentName?: string,
) {
  const out: Record<string, unknown> = {};
  for (const key in hash) {
    if (!Object.hasOwn(hash, key)) {
      continue;
    }

    const value = hash[key];
    out[key] = {
      ...value,
      id: parentName ? `${parentName}:${key}` : key,
      name: key,
      ...(parentName ? { component: parentName } : {}),
    };
  }

  return out;
}
