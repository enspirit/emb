import { describe, expect, test } from 'vitest';

import {
  aggregateSecrets,
  DiscoveredSecret,
  discoverSecrets,
} from '@/secrets/SecretDiscovery.js';

/* eslint-disable no-template-curly-in-string */
// Test data intentionally contains literal ${...} patterns as test input

// Mock set of registered providers for testing
const TEST_PROVIDERS = new Set(['vault']);

describe('Secrets / SecretDiscovery', () => {
  describe('#discoverSecrets()', () => {
    test('finds vault secret references in strings', () => {
      const config = {
        env: {
          DB_PASSWORD: '${vault:secret/myapp/db#password}',
        },
      };

      const secrets = discoverSecrets(config, {}, TEST_PROVIDERS);

      expect(secrets).toHaveLength(1);
      expect(secrets[0]).toMatchObject({
        provider: 'vault',
        path: 'secret/myapp/db',
        key: 'password',
        location: { field: 'env.DB_PASSWORD' },
      });
    });

    test('finds secrets without keys', () => {
      const config = {
        data: '${vault:secret/myapp/config}',
      };

      const secrets = discoverSecrets(config, {}, TEST_PROVIDERS);

      expect(secrets).toHaveLength(1);
      expect(secrets[0]).toMatchObject({
        provider: 'vault',
        path: 'secret/myapp/config',
        key: undefined,
      });
    });

    test('finds secrets with complex paths', () => {
      const config = {
        secret:
          '${vault:op/q8s.dev/vaults/my-vault/items/my-item#cookie-secret}',
      };

      const secrets = discoverSecrets(config, {}, TEST_PROVIDERS);

      expect(secrets).toHaveLength(1);
      expect(secrets[0]).toMatchObject({
        provider: 'vault',
        path: 'op/q8s.dev/vaults/my-vault/items/my-item',
        key: 'cookie-secret',
      });
    });

    test('finds multiple secrets in same string', () => {
      const config = {
        connection:
          'user=${vault:secret/db#user}:${vault:secret/db#password}@host',
      };

      const secrets = discoverSecrets(config, {}, TEST_PROVIDERS);

      expect(secrets).toHaveLength(2);
      expect(secrets[0].key).toBe('user');
      expect(secrets[1].key).toBe('password');
    });

    test('finds secrets in nested objects', () => {
      const config = {
        database: {
          credentials: {
            password: '${vault:secret/db#password}',
          },
        },
      };

      const secrets = discoverSecrets(config, {}, TEST_PROVIDERS);

      expect(secrets).toHaveLength(1);
      expect(secrets[0].location.field).toBe('database.credentials.password');
    });

    test('finds secrets in arrays', () => {
      const config = {
        secrets: ['${vault:secret/first#key}', '${vault:secret/second#key}'],
      };

      const secrets = discoverSecrets(config, {}, TEST_PROVIDERS);

      expect(secrets).toHaveLength(2);
      expect(secrets[0].location.field).toBe('secrets[0]');
      expect(secrets[1].location.field).toBe('secrets[1]');
    });

    test('ignores env references', () => {
      const config = {
        path: '${env:HOME}',
        user: '${env:USER:-default}',
      };

      const secrets = discoverSecrets(config, {}, TEST_PROVIDERS);

      expect(secrets).toHaveLength(0);
    });

    test('ignores vars references', () => {
      const config = {
        value: '${vars:MY_VAR}',
      };

      const secrets = discoverSecrets(config, {}, TEST_PROVIDERS);

      expect(secrets).toHaveLength(0);
    });

    test('ignores unregistered providers', () => {
      const config = {
        secret: '${unknown:path/to/secret#key}',
      };

      const secrets = discoverSecrets(config, {}, TEST_PROVIDERS);

      expect(secrets).toHaveLength(0);
    });

    test('includes location information', () => {
      const config = {
        password: '${vault:secret/app#pass}',
      };

      const secrets = discoverSecrets(
        config,
        {
          file: 'Embfile.yml',
          component: 'api',
        },
        TEST_PROVIDERS,
      );

      expect(secrets[0].location).toMatchObject({
        file: 'Embfile.yml',
        component: 'api',
        field: 'password',
      });
    });

    test('handles secrets with fallback values', () => {
      const config = {
        optional: '${vault:secret/optional#key:-default}',
      };

      const secrets = discoverSecrets(config, {}, TEST_PROVIDERS);

      expect(secrets).toHaveLength(1);
      expect(secrets[0].path).toBe('secret/optional');
      expect(secrets[0].key).toBe('key');
    });

    test('handles empty config', () => {
      const secrets = discoverSecrets({}, {}, TEST_PROVIDERS);
      expect(secrets).toHaveLength(0);
    });

    test('handles null and undefined values', () => {
      const config = {
        a: null,
        b: undefined,
        c: '${vault:secret#key}',
      };

      const secrets = discoverSecrets(
        config as Record<string, unknown>,
        {},
        TEST_PROVIDERS,
      );

      expect(secrets).toHaveLength(1);
    });
  });

  describe('#aggregateSecrets()', () => {
    test('combines duplicate secrets', () => {
      const secrets: DiscoveredSecret[] = [
        {
          provider: 'vault',
          path: 'secret/db',
          key: 'password',
          original: '${vault:secret/db#password}',
          location: { field: 'env.DB_PASS', component: 'api' },
        },
        {
          provider: 'vault',
          path: 'secret/db',
          key: 'password',
          original: '${vault:secret/db#password}',
          location: { field: 'env.PASSWORD', component: 'worker' },
        },
      ];

      const aggregated = aggregateSecrets(secrets);

      expect(aggregated).toHaveLength(1);
      expect(aggregated[0].locations).toHaveLength(2);
      expect(aggregated[0].locations[0].component).toBe('api');
      expect(aggregated[0].locations[1].component).toBe('worker');
    });

    test('keeps different secrets separate', () => {
      const secrets: DiscoveredSecret[] = [
        {
          provider: 'vault',
          path: 'secret/db',
          key: 'password',
          original: '${vault:secret/db#password}',
          location: { field: 'a' },
        },
        {
          provider: 'vault',
          path: 'secret/db',
          key: 'username',
          original: '${vault:secret/db#username}',
          location: { field: 'b' },
        },
      ];

      const aggregated = aggregateSecrets(secrets);

      expect(aggregated).toHaveLength(2);
    });

    test('handles empty input', () => {
      const aggregated = aggregateSecrets([]);
      expect(aggregated).toHaveLength(0);
    });
  });
});
