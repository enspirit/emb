type ExpandOptions = {
  default?: string;
  sources?: Record<string, Record<string, string>>;
};

const TPL_REGEX = /(?<!\\)\${(?:(\w+):)?(\w+)(?::-(.*?))?}/g;

export const expand = async (str: string, options: ExpandOptions = {}) => {
  return (
    str
      // Expand variables
      .replaceAll(TPL_REGEX, (match, source, key, fallback) => {
        const provider = options.sources?.[source || options.default];

        if (!provider) {
          if (fallback) {
            return fallback;
          }

          throw new Error(`Invalid expand provider '${source}' ('${match}')`);
        }

        const val = provider[key as keyof typeof provider];

        if (!val && !fallback) {
          throw new Error(
            `Could not expand '${match}' and no default value provided`,
          );
        }

        return val ?? fallback;
      })
      // Unescape non-variables left
      .replaceAll('\\${', '${')
  );
};

export const expandRecord = (
  record: Record<string, string>,
  options: ExpandOptions = {},
): Promise<Record<PropertyKey, string>> => {
  return Object.entries(record).reduce(
    async (vars, [name, str]) => {
      const previous = await vars;

      previous[name] = await expand(str, options);

      return previous;
    },
    Promise.resolve({}) as Promise<Record<PropertyKey, string>>,
  );
};
