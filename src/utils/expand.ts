export type SourceMap = Record<string, Record<string, (() => string) | string>>;

export type ExpandOptions<TSources extends SourceMap> = {
  default?: keyof TSources;
  sources?: TSources;
};

const TPL_REGEX = /(?<!\\)\${(?:(\w+):)?(\w+)(?::-(.*?))?}/g;

export const expand = async <S extends SourceMap>(
  str: string,
  options: ExpandOptions<S> = {},
) => {
  return str
    // Expand variables
    .replaceAll(TPL_REGEX, (match, source, key, fallback) => {
      const provider = options.sources?.[source || options.default];

      if (!provider) {
        if (fallback) {
          return fallback;
        } else {
          throw new Error(`Invalid expand provider '${source}' ('${match}')`);
        }
      }

      const val =
        typeof provider[key] === 'function'
        ? provider[key]?.()
        : provider[key];

      if (!val && !fallback) {
        throw new Error(`Could not expand '${match}' and no default value provided`);
      }

      return val ?? fallback;
    })
    // Unescape non-variables left
    .replace(/\\\$\{/g, '${');
};
