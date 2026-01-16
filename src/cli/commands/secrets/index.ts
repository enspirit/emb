import { getContext } from '@';
import { printTable } from '@oclif/table';

import { FlavoredCommand, TABLE_DEFAULTS } from '@/cli';
import {
  AggregatedSecret,
  aggregateSecrets,
  discoverSecrets,
} from '@/secrets/SecretDiscovery.js';

export interface SecretInfo {
  component?: string;
  key?: string;
  path: string;
  provider: string;
  usageCount: number;
}

export default class SecretsIndex extends FlavoredCommand<typeof SecretsIndex> {
  static description = 'List all secret references in the configuration.';
  static enableJsonFlag = true;
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --json',
  ];

  public async run(): Promise<SecretInfo[]> {
    const { flags } = await this.parse(SecretsIndex);
    const context = getContext();
    const { monorepo, secrets } = context;

    // Get registered secret providers dynamically
    const secretProviders = new Set(secrets.getProviderNames());

    // Collect secrets from all configuration sources
    const allSecrets: ReturnType<typeof discoverSecrets> = [];

    // Scan monorepo-level config (env, vars, tasks, defaults, flavors)
    allSecrets.push(
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

    // Scan each component's config
    for (const component of monorepo.components) {
      allSecrets.push(
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

    // Aggregate by unique secret reference
    const aggregated = aggregateSecrets(allSecrets);

    // Convert to output format
    const result: SecretInfo[] = aggregated.map((secret: AggregatedSecret) => ({
      provider: secret.provider,
      path: secret.path,
      key: secret.key,
      component:
        secret.locations
          .map((l) => l.component)
          .filter(Boolean)
          .join(', ') || undefined,
      usageCount: secret.locations.length,
    }));

    if (!flags.json) {
      if (result.length === 0) {
        this.log('No secret references found in configuration.');
      } else {
        printTable({
          ...TABLE_DEFAULTS,
          columns: ['provider', 'path', 'key', 'component', 'usageCount'],
          data: result.map((r) => ({
            ...r,
            key: r.key || '-',
            component: r.component || '-',
          })),
        });

        const providerCount = new Set(result.map((r) => r.provider)).size;
        this.log(
          `\nFound ${result.length} secret reference(s) using ${providerCount} provider(s).`,
        );
      }
    }

    return result;
  }
}
