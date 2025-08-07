import deepmerge from '@fastify/deepmerge';

export const deepMergeArray = <T>(
  target: Array<T>,
  source: Array<T>,
  identifierFn?: (item: T) => unknown,
): Array<T> => {
  if (!identifierFn) {
    return deepmerge()(target, source);
  }

  const overridden: Array<T> = target.map((item) => {
    const id = identifierFn(item);
    const override = source.find((item) => identifierFn(item) === id);

    if (override) {
      return deepmerge()(item, override) as T;
    }

    return item;
  });

  const additional = source.filter((item) => {
    const id = identifierFn(item);
    return !target.find((item) => identifierFn(item) === id);
  });

  return [...overridden, ...additional];
};
