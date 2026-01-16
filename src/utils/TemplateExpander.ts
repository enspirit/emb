/**
 * An async source is a function that returns a promise resolving to the value.
 */
type AsyncSource = (key: string) => Promise<unknown>;

/**
 * A static source is a simple key-value record.
 */
type StaticSource = Record<string, unknown>;

/**
 * A source can be either static or async.
 */
type Source = AsyncSource | StaticSource;

type ExpandOptions = {
  default?: string;
  sources?: Record<string, Source>;
};

// Matches ${source:key} or ${key} patterns
// - Source name: word characters only (e.g., "vault", "env")
// - Key: word characters, slashes, hashes, dots, with hyphens allowed between segments
//   (e.g., "secret/path#field", "MY_VAR", "secret/my-app#key")
// - Optional fallback: :-value
// The key pattern uses (?:-[\w/#.]+)* to allow hyphens only between valid segments,
// preventing the key from consuming the :- fallback delimiter.
const TPL_REGEX = /(?<!\\)\${(?:(\w+):)?([\w/#.]+(?:-[\w/#.]+)*)(?::-(.*?))?}/g;

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

/**
 * Check if a source is async (a function).
 */
function isAsyncSource(source: Source): source is AsyncSource {
  return typeof source === 'function';
}

export class TemplateExpander {
  private expansions: ExpansionHistory[] = [];

  get expansionCount() {
    return this.expansions.length;
  }

  async expand(str: string, options: ExpandOptions = {}): Promise<string> {
    const input = (str || '').toString();

    // Collect all matches with their positions
    const matches = [...input.matchAll(TPL_REGEX)];

    if (matches.length === 0) {
      return input.replaceAll('\\${', '${');
    }

    // Resolve all values (async for function sources, sync for objects)
    const resolutions = await Promise.all(
      matches.map(async (match) => {
        const [fullMatch, sourceName, key, fallback] = match;
        const src = sourceName ?? options.default ?? '';
        const source = options.sources?.[src];

        // No source found
        if (!source) {
          if (fallback !== undefined) {
            return {
              match: fullMatch,
              value: this.track(src, key, fallback),
            };
          }

          throw new Error(
            `Invalid expand provider '${sourceName}' ('${fullMatch}')`,
          );
        }

        // Resolve value based on source type
        let val: unknown;
        if (isAsyncSource(source)) {
          try {
            val = await source(key);
          } catch (error) {
            if (fallback !== undefined) {
              return {
                match: fullMatch,
                value: this.track(src, key, fallback),
              };
            }

            throw error;
          }
        } else {
          val = source[key as keyof typeof source];
        }

        // Handle missing values
        if (!val && fallback === undefined) {
          throw new Error(
            `Could not expand '${fullMatch}' and no default value provided`,
          );
        }

        if (val !== undefined && val !== null) {
          return {
            match: fullMatch,
            value: this.track(src, key, val),
          };
        }

        return {
          match: fullMatch,
          value: this.track(src, key, fallback ?? ''),
        };
      }),
    );

    // Build result string by replacing matches with resolved values
    let result = input;
    for (const { match, value } of resolutions) {
      result = result.replace(match, value);
    }

    return result.replaceAll('\\${', '${');
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
