import { getContext } from '@';
import { printTable } from '@oclif/table';

import { FlavoredCommand, TABLE_DEFAULTS } from '@/cli';

export interface ProviderInfo {
  name: string;
  status: 'connected' | 'not_configured';
  type: string;
}

export default class SecretsProviders extends FlavoredCommand<
  typeof SecretsProviders
> {
  static description = 'Show configured secret providers and their status.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<ProviderInfo[]> {
    const { flags } = await this.parse(SecretsProviders);
    const context = getContext();
    const { secrets } = context;

    const providerNames = secrets.getProviderNames();

    if (providerNames.length === 0) {
      if (!flags.json) {
        this.log('No secret providers configured.');
        this.log('\nTo configure a provider, add it to your .emb.yml:');
        this.log(`
plugins:
  - name: vault
    config:
      address: https://vault.example.com
      auth:
        method: oidc
`);
      }

      return [];
    }

    const results: ProviderInfo[] = providerNames.map((name) => {
      const provider = secrets.get(name);
      return {
        name,
        type: provider?.constructor.name || 'Unknown',
        status: provider ? 'connected' : 'not_configured',
      };
    });

    if (!flags.json) {
      printTable({
        ...TABLE_DEFAULTS,
        columns: ['name', 'type', 'status'],
        data: results.map((r) => ({
          name: r.name,
          type: r.type,
          status: r.status === 'connected' ? '✔ Connected' : '✖ Not configured',
        })),
      });

      this.log(`\n${results.length} provider(s) configured.`);
    }

    return results;
  }
}
