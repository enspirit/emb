import { getContext } from '@';
import { printTable } from '@oclif/table';

import { FlavoredCommand, TABLE_DEFAULTS } from '@/cli';
import {
  AggregatedSecret,
  collectAllSecrets,
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

    // Collect and aggregate secrets from all configuration sources
    const aggregated = collectAllSecrets(monorepo, secretProviders);

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
