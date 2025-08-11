type ExpandOptions = {
  default?: string;
  sources?: Record<string, Record<string, unknown>>;
};

const TPL_REGEX = /(?<!\\)\${(?:(\w+):)?(\w+)(?::-(.*?))?}/g;

export type ExpansionHistory = {
  source: string;
  value: unknown;
  variable: string;
};

export class TemplateExpander {
  /**
   * Keep track of the sources used for expansions
   * (track source, name, final value)
   */
  private expansions: Array<ExpansionHistory> = [];

  get expansionCount() {
    return this.expansions.length;
  }

  async expand(str: string, options: ExpandOptions = {}) {
    return (
      (str || '')
        .toString()
        // Expand variables
        .replaceAll(TPL_REGEX, (match, source, key, fallback) => {
          const src = source || options.default;
          const provider = options.sources?.[src];

          if (!provider) {
            if (fallback !== undefined) {
              return this.track(src, key, fallback);
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

          if (val !== undefined && val !== null) {
            return this.track(src, key, val);
          }

          return this.track(src, key, fallback || '');
        })
        // Unescape non-variables left
        .replaceAll('\\${', '${')
    );
  }

  expandRecord<R extends Record<string, unknown>>(
    record: R,
    options: ExpandOptions,
  ): Promise<R>;
  expandRecord<R extends Array<unknown>>(
    record: R,
    options: ExpandOptions,
  ): Promise<R>;
  async expandRecord(record: unknown, options: ExpandOptions = {}) {
    if (Array.isArray(record)) {
      return Promise.all(record.map((v) => this.expand(v as string, options)));
    }

    return Object.entries(record as Record<string, unknown>).reduce(
      async (vars, [name, str]) => {
        const previous = await vars;

        previous[name] = await (typeof str === 'object'
          ? this.expandRecord(str as Record<string, unknown>, options)
          : this.expand(str as string, options));

        return previous;
      },
      Promise.resolve({}) as Promise<Record<string, unknown>>,
    );
  }

  private track<T>(source: string, variable: string, value: T) {
    this.expansions.push({ source, value, variable });
    return value;
  }
}
