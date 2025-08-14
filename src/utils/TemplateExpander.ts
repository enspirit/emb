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

export type Expandable =
  | readonly Expandable[]
  | string
  | { readonly [k: string]: Expandable };

type ExpandResult<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? ReadonlyArray<ExpandResult<U>>
    : T extends { readonly [K in keyof T]: Expandable }
      ? { readonly [K in keyof T]: ExpandResult<T[K]> }
      : T;

export class TemplateExpander {
  private expansions: ExpansionHistory[] = [];

  get expansionCount() {
    return this.expansions.length;
  }

  async expand(str: string, options: ExpandOptions = {}): Promise<string> {
    return (str || '')
      .toString()
      .replaceAll(TPL_REGEX, (match, source, key, fallback) => {
        const src = source ?? options.default ?? '';
        const provider = options.sources?.[src];

        if (!provider) {
          if (fallback !== undefined) {
            return this.track(src, key, fallback);
          }

          throw new Error(`Invalid expand provider '${source}' ('${match}')`);
        }

        const val = provider[key as keyof typeof provider];

        if (!val && fallback === undefined) {
          throw new Error(
            `Could not expand '${match}' and no default value provided`,
          );
        }

        if (val !== undefined && val !== null) {
          return this.track(src, key, val);
        }

        return this.track(src, key, fallback ?? '');
      })
      .replaceAll('\\${', '${');
  }

  async expandRecord<T extends Expandable>(
    record: T,
    options: ExpandOptions,
  ): Promise<ExpandResult<T>> {
    if (typeof record === 'string') {
      const out = await this.expand(record, options);
      return out as ExpandResult<T>;
    }

    if (Array.isArray(record)) {
      const out = await Promise.all(
        record.map((v) => this.expandRecord(v, options)),
      );
      return out as unknown as ExpandResult<T>;
    }

    const entries = await Promise.all(
      Object.entries(record).map(async ([k, v]) => {
        const expandedValue = await this.expandRecord(v, options);
        return [k, expandedValue] as const;
      }),
    );

    return Object.fromEntries(entries) as ExpandResult<T>;
  }

  private track<T>(source: string, variable: string, value: T): string {
    this.expansions.push({ source, value, variable });
    return String(value);
  }
}
