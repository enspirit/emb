type ExpandOptions = {
  default?: string;
  sources?: Record<string, Record<string, unknown>>;
};

const TPL_REGEX = /(?<!\\)\${(?:(\w+):)?(\w+)(?::-(.*?))?}/g;

export class TemplateExpander {
  async expand(str: string, options: ExpandOptions = {}) {
    return (
      (str || '')
        .toString()
        // Expand variables
        .replaceAll(TPL_REGEX, (match, source, key, fallback) => {
          const provider = options.sources?.[source || options.default];

          if (!provider) {
            if (fallback !== undefined) {
              return fallback;
            }

            throw new Error(`Invalid expand provider '${source}' ('${match}')`);
          }

          const val = provider[key as keyof typeof provider];

          // fallback is undefined when not even the :- is present
          // we consider a variable like ${source:key:-} like the information
          // that the variable can be an empty string if not present
          if (!val && fallback === undefined) {
            throw new Error(
              `Could not expand '${match}' and no default value provided`,
            );
          }

          return val ?? fallback;
        })
        // Unescape non-variables left
        .replaceAll('\\${', '${')
    );
  }

  async expandRecord<R extends Record<string, unknown>>(
    record: R,
    options: ExpandOptions = {},
  ): Promise<R> {
    return Object.entries(record).reduce(
      async (vars, [name, str]) => {
        const previous = await vars;

        // @ts-expect-error dunno
        previous[name] = await (typeof str === 'object'
          ? this.expandRecord(str as Record<string, unknown>, options)
          : this.expand(str as string, options));

        return previous;
      },
      Promise.resolve({}) as Promise<R>,
    );
  }
}
