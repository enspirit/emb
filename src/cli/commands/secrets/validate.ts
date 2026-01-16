import { getContext } from '@';
import { Flags } from '@oclif/core';
import { printTable } from '@oclif/table';

import { FlavoredCommand, TABLE_DEFAULTS } from '@/cli';
import {
  AggregatedSecret,
  aggregateSecrets,
  discoverSecrets,
} from '@/secrets/SecretDiscovery.js';

export interface ValidationResult {
  error?: string;
  key?: string;
  path: string;
  provider: string;
  status: 'error' | 'ok';
}

export default class SecretsValidate extends FlavoredCommand<
  typeof SecretsValidate
> {
  static description =
    'Validate that all secret references can be resolved (without showing values).';
  static enableJsonFlag = true;
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --fail-fast',
    '<%= config.bin %> <%= command.id %> --json',
  ];
  static flags = {
    'fail-fast': Flags.boolean({
      default: false,
      description: 'Stop on first validation error',
    }),
  };

  public async run(): Promise<ValidationResult[]> {
    const { flags } = await this.parse(SecretsValidate);
    const context = getContext();
    const { monorepo } = context;
    const { secrets } = context;

    // Collect secrets from all configuration sources
    const allSecrets: ReturnType<typeof discoverSecrets> = [];

    // Scan monorepo-level config
    allSecrets.push(
      ...discoverSecrets(
        {
          env: monorepo.config.env,
          vars: monorepo.config.vars,
          tasks: monorepo.config.tasks,
        },
        { file: '.emb.yml' },
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
        ),
      );
    }

    // Aggregate by unique secret reference
    const aggregated = aggregateSecrets(allSecrets);

    if (aggregated.length === 0) {
      if (!flags.json) {
        this.log('No secret references found in configuration.');
      }

      return [];
    }

    // Validate each secret
    const results: ValidationResult[] = [];
    let hasErrors = false;

    for (const secret of aggregated) {
      // Sequential validation is intentional for fail-fast support
      // eslint-disable-next-line no-await-in-loop
      const result = await this.validateSecret(secret, secrets);
      results.push(result);

      if (result.status === 'error') {
        hasErrors = true;
        if (flags['fail-fast']) {
          break;
        }
      }
    }

    if (!flags.json) {
      printTable({
        ...TABLE_DEFAULTS,
        columns: ['status', 'provider', 'path', 'key'],
        data: results.map((r) => ({
          status: r.status === 'ok' ? '✔' : '✖',
          provider: r.provider,
          path: r.path,
          key: r.key || '-',
        })),
      });

      const passed = results.filter((r) => r.status === 'ok').length;
      const failed = results.filter((r) => r.status === 'error').length;

      this.log(`\nValidation: ${passed} passed, ${failed} failed`);

      // Show error details
      const errors = results.filter((r) => r.status === 'error');
      if (errors.length > 0) {
        this.log('\nError details:');
        for (const error of errors) {
          const ref = error.key
            ? `${error.provider}:${error.path}#${error.key}`
            : `${error.provider}:${error.path}`;
          this.log(`  - ${ref}: ${error.error}`);
        }
      }
    }

    // Exit with error code if validation failed
    if (hasErrors) {
      this.exit(1);
    }

    return results;
  }

  private async validateSecret(
    secret: AggregatedSecret,
    secrets: typeof import('@/secrets').SecretManager.prototype,
  ): Promise<ValidationResult> {
    const provider = secrets.get(secret.provider);

    if (!provider) {
      return {
        provider: secret.provider,
        path: secret.path,
        key: secret.key,
        status: 'error',
        error: `Provider '${secret.provider}' not configured`,
      };
    }

    try {
      // Actually fetch the secret to verify access
      const result = await provider.get({
        path: secret.path,
        key: secret.key,
      });

      // If a key was specified, verify it exists
      if (secret.key && result === undefined) {
        return {
          provider: secret.provider,
          path: secret.path,
          key: secret.key,
          status: 'error',
          error: `Key '${secret.key}' not found in secret`,
        };
      }

      return {
        provider: secret.provider,
        path: secret.path,
        key: secret.key,
        status: 'ok',
      };
    } catch (error) {
      return {
        provider: secret.provider,
        path: secret.path,
        key: secret.key,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
