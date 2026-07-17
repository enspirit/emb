import type { Monorepo } from '@/monorepo';

/**
 * Location where a secret reference was found.
 */
export interface SecretLocation {
  /** Component name (if applicable) */
  component?: string;
  /** Field path within the config (e.g., "env.DB_PASSWORD") */
  field: string;
  /** File path where the reference was found */
  file?: string;
}

/**
 * A discovered secret reference in the configuration.
 */
export interface DiscoveredSecret {
  /** Key within the secret (e.g., "password") */
  key?: string;
  /** Where this reference was found */
  location: SecretLocation;
  /** Original template string (e.g., "${vault:secret/myapp#password}") */
  original: string;
  /** Path to the secret (e.g., "secret/myapp/db") */
  path: string;
  /** Provider name (e.g., "vault") */
  provider: string;
}

// Matches ${provider:path#key} patterns for secret providers
// We're specifically looking for non-env providers (vault, aws, azure, etc.)
const SECRET_REGEX =
  /\${(\w+):([\w/.]+(?:-[\w/.]+)*)(?:#([\w-]+))?(?::-[^}]*)?}/g;

/**
 * Recursively find all secret references in an object.
 */
// eslint-disable-next-line max-params
function findSecretsInValue(
  value: unknown,
  fieldPath: string,
  location: Omit<SecretLocation, 'field'>,
  secretProviders: Set<string>,
  results: DiscoveredSecret[],
): void {
  if (typeof value === 'string') {
    // Find all secret references in the string
    let match;
    SECRET_REGEX.lastIndex = 0; // Reset regex state
    while ((match = SECRET_REGEX.exec(value)) !== null) {
      const [original, provider, pathWithKey, explicitKey] = match;

      // Only include registered secret providers
      if (!secretProviders.has(provider)) {
        continue;
      }

      // Parse path and key - key can be after # or part of path
      let path = pathWithKey;
      let key = explicitKey;

      // If no explicit key via #, check if path contains #
      if (!key && path.includes('#')) {
        const hashIndex = path.indexOf('#');
        key = path.slice(hashIndex + 1);
        path = path.slice(0, hashIndex);
      }

      results.push({
        provider,
        path,
        key,
        original,
        location: {
          ...location,
          field: fieldPath,
        },
      });
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findSecretsInValue(
        item,
        `${fieldPath}[${index}]`,
        location,
        secretProviders,
        results,
      );
    });
  } else if (value !== null && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      const newPath = fieldPath ? `${fieldPath}.${key}` : key;
      findSecretsInValue(val, newPath, location, secretProviders, results);
    }
  }
}

/**
 * Discover all secret references in a configuration object.
 *
 * @param config - The configuration object to scan
 * @param location - Base location information
 * @param secretProviders - Set of registered secret provider names to look for
 * @returns Array of discovered secret references
 */
export function discoverSecrets(
  config: Record<string, unknown>,
  location: Omit<SecretLocation, 'field'> = {},
  secretProviders: Set<string> = new Set(),
): DiscoveredSecret[] {
  const results: DiscoveredSecret[] = [];
  findSecretsInValue(config, '', location, secretProviders, results);
  return results;
}

/**
 * Deduplicate secret references by provider+path+key.
 * Keeps track of all locations where each secret is used.
 */
export interface AggregatedSecret {
  key?: string;
  locations: SecretLocation[];
  path: string;
  provider: string;
}

export function aggregateSecrets(
  secrets: DiscoveredSecret[],
): AggregatedSecret[] {
  const map = new Map<string, AggregatedSecret>();

  for (const secret of secrets) {
    const id = `${secret.provider}:${secret.path}#${secret.key || ''}`;

    if (map.has(id)) {
      map.get(id)!.locations.push(secret.location);
    } else {
      map.set(id, {
        provider: secret.provider,
        path: secret.path,
        key: secret.key,
        locations: [secret.location],
      });
    }
  }

  return [...map.values()];
}

/**
 * Discover every secret reference across a whole monorepo — the top-level
 * config (env, vars, tasks, defaults, flavors) plus each component's config
 * (tasks, resources) — and aggregate them by unique provider+path+key.
 *
 * This is the single source of truth for the `secrets` and `secrets validate`
 * commands, which previously carried identical copies of this scan.
 *
 * @param monorepo - The initialized monorepo to scan
 * @param secretProviders - Set of registered secret provider names to look for
 * @returns Aggregated secret references, deduplicated across all locations
 */
export function collectAllSecrets(
  monorepo: Monorepo,
  secretProviders: Set<string>,
): AggregatedSecret[] {
  const discovered: DiscoveredSecret[] = [];

  // Monorepo-level config (env, vars, tasks, defaults, flavors)
  discovered.push(
    ...discoverSecrets(
      {
        env: monorepo.config.env,
        vars: monorepo.config.vars,
        tasks: monorepo.config.tasks,
        defaults: monorepo.config.defaults,
        flavors: monorepo.config.flavors,
      },
      { file: '.emb.yml' },
      secretProviders,
    ),
  );

  // Each component's config (tasks, resources)
  for (const component of monorepo.components) {
    discovered.push(
      ...discoverSecrets(
        {
          tasks: component.config.tasks,
          resources: component.config.resources,
        },
        {
          file: `${component.name}/Embfile.yml`,
          component: component.name,
        },
        secretProviders,
      ),
    );
  }

  return aggregateSecrets(discovered);
}
