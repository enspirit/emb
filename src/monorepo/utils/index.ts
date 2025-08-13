import { ComponentIdentifiable } from '@';

export * from './EMBCollection.js';
export * from './graph.js';
export * from './types.js';

export const toIdentifedHash = <V, T extends { [k: string]: V }>(
  hash: T,
  parentName: string,
): Record<string, ComponentIdentifiable<V>> => {
  return Object.entries(hash).reduce<Record<string, ComponentIdentifiable<V>>>(
    (hash, [key, value]) => {
      hash[key] = {
        ...value,
        id: `${parentName}:${key}`,
        name: key,
        component: parentName,
      };

      return hash;
    },
    {},
  );
};
