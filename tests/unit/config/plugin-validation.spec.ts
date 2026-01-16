import { describe, expect, test } from 'vitest';

import { validateUserConfig } from '../../../src/config/validation.js';

/**
 * These tests verify that plugin configurations are properly validated.
 *
 * Currently, plugin configs use `"config": {}` in the schema which allows
 * any object. The tests marked with "should reject" are expected to fail
 * until proper per-plugin validation is implemented.
 */
describe('Config / Plugin Validation', () => {
  const validProject = { project: { name: 'test' }, components: {} };

  describe('vault plugin', () => {
    describe('valid configs', () => {
      test('accepts minimal config (empty)', async () => {
        const config = {
          ...validProject,
          plugins: [{ name: 'vault', config: {} }],
        };

        const result = await validateUserConfig(config);

        expect(result.plugins).toHaveLength(1);
        expect(result.plugins![0].name).toBe('vault');
      });

      test('accepts config with address only', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'vault',
              config: {
                address: 'http://localhost:8200',
              },
            },
          ],
        };

        const result = await validateUserConfig(config);

        expect(result.plugins![0].config).toEqual({
          address: 'http://localhost:8200',
        });
      });

      test('accepts config with token auth', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'vault',
              config: {
                address: 'http://localhost:8200',
                auth: {
                  method: 'token',
                  token: 'my-token',
                },
              },
            },
          ],
        };

        const result = await validateUserConfig(config);

        expect(result.plugins![0].config).toEqual({
          address: 'http://localhost:8200',
          auth: { method: 'token', token: 'my-token' },
        });
      });

      test('accepts config with approle auth', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'vault',
              config: {
                address: 'http://localhost:8200',
                auth: {
                  method: 'approle',
                  roleId: 'role-123',
                  secretId: 'secret-456',
                },
              },
            },
          ],
        };

        const result = await validateUserConfig(config);
        const pluginConfig = result.plugins![0].config as {
          auth: { method: string };
        };

        expect(pluginConfig.auth.method).toBe('approle');
      });

      test('accepts config with oidc auth', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'vault',
              config: {
                address: 'http://localhost:8200',
                auth: {
                  method: 'oidc',
                  role: 'my-role',
                },
              },
            },
          ],
        };

        const result = await validateUserConfig(config);
        const pluginConfig = result.plugins![0].config as {
          auth: { method: string };
        };

        expect(pluginConfig.auth.method).toBe('oidc');
      });

      test('accepts config with namespace', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'vault',
              config: {
                address: 'http://localhost:8200',
                namespace: 'my-namespace',
              },
            },
          ],
        };

        const result = await validateUserConfig(config);
        const pluginConfig = result.plugins![0].config as { namespace: string };

        expect(pluginConfig.namespace).toBe('my-namespace');
      });
    });

    describe('invalid configs', () => {
      test('should reject config with unknown properties', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'vault',
              config: {
                address: 'http://localhost:8200',
                unknownProperty: 'should-not-be-allowed',
              },
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });

      test('should reject config with invalid auth method', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'vault',
              config: {
                address: 'http://localhost:8200',
                auth: {
                  method: 'invalid-method',
                },
              },
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });

      test('should reject token auth without token', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'vault',
              config: {
                auth: {
                  method: 'token',
                  // missing required 'token' field
                },
              },
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });

      test('should reject approle auth without roleId', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'vault',
              config: {
                auth: {
                  method: 'approle',
                  secretId: 'secret-456',
                  // missing required 'roleId' field
                },
              },
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });

      test('should reject config with address as number', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'vault',
              config: {
                address: 12_345,
              },
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });
    });
  });

  describe('autodocker plugin', () => {
    describe('valid configs', () => {
      test('accepts minimal config (empty)', async () => {
        const config = {
          ...validProject,
          plugins: [{ name: 'autodocker', config: {} }],
        };

        const result = await validateUserConfig(config);

        expect(result.plugins![0].name).toBe('autodocker');
      });

      test('accepts config with glob pattern', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'autodocker',
              config: {
                glob: '*/Dockerfile',
              },
            },
          ],
        };

        const result = await validateUserConfig(config);
        const pluginConfig = result.plugins![0].config as { glob: string };

        expect(pluginConfig.glob).toBe('*/Dockerfile');
      });

      test('accepts config with ignore as string', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'autodocker',
              config: {
                ignore: 'node_modules',
              },
            },
          ],
        };

        const result = await validateUserConfig(config);
        const pluginConfig = result.plugins![0].config as { ignore: string };

        expect(pluginConfig.ignore).toBe('node_modules');
      });

      test('accepts config with ignore as array', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'autodocker',
              config: {
                ignore: ['node_modules', 'dist'],
              },
            },
          ],
        };

        const result = await validateUserConfig(config);
        const pluginConfig = result.plugins![0].config as { ignore: string[] };

        expect(pluginConfig.ignore).toEqual(['node_modules', 'dist']);
      });
    });

    describe('invalid configs', () => {
      test('should reject config with unknown properties', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'autodocker',
              config: {
                unknownProperty: 'should-not-be-allowed',
              },
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });

      test('should reject config with glob as number', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'autodocker',
              config: {
                glob: 12_345,
              },
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });

      test('should reject config with ignore as object', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'autodocker',
              config: {
                ignore: { pattern: 'node_modules' },
              },
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });
    });
  });

  describe('dotenv plugin', () => {
    describe('valid configs', () => {
      test('accepts array of file paths', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'dotenv',
              config: ['.env', '.env.local'],
            },
          ],
        };

        const result = await validateUserConfig(config);

        expect(result.plugins![0].config).toEqual(['.env', '.env.local']);
      });

      test('accepts empty array', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'dotenv',
              config: [],
            },
          ],
        };

        const result = await validateUserConfig(config);

        expect(result.plugins![0].config).toEqual([]);
      });
    });

    describe('invalid configs', () => {
      test('should reject config as object instead of array', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'dotenv',
              config: {
                paths: ['.env'],
              },
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });

      test('should reject config as string instead of array', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'dotenv',
              config: '.env',
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });

      test('should reject array with non-string elements', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'dotenv',
              config: ['.env', 123, '.env.local'],
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });
    });
  });

  describe('embfiles plugin', () => {
    describe('valid configs', () => {
      test('accepts minimal config (empty)', async () => {
        const config = {
          ...validProject,
          plugins: [{ name: 'embfiles', config: {} }],
        };

        const result = await validateUserConfig(config);

        expect(result.plugins![0].name).toBe('embfiles');
      });

      test('accepts config with glob as string', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'embfiles',
              config: {
                glob: '*/Embfile.yml',
              },
            },
          ],
        };

        const result = await validateUserConfig(config);
        const pluginConfig = result.plugins![0].config as { glob: string };

        expect(pluginConfig.glob).toBe('*/Embfile.yml');
      });

      test('accepts config with glob as array', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'embfiles',
              config: {
                glob: ['*/Embfile.yml', '*/Embfile.yaml'],
              },
            },
          ],
        };

        const result = await validateUserConfig(config);
        const pluginConfig = result.plugins![0].config as { glob: string[] };

        expect(pluginConfig.glob).toEqual(['*/Embfile.yml', '*/Embfile.yaml']);
      });
    });

    describe('invalid configs', () => {
      test('should reject config with unknown properties', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'embfiles',
              config: {
                unknownProperty: 'should-not-be-allowed',
              },
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });

      test('should reject config with glob as number', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'embfiles',
              config: {
                glob: 12_345,
              },
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });

      test('should reject config with glob as object', async () => {
        const config = {
          ...validProject,
          plugins: [
            {
              name: 'embfiles',
              config: {
                glob: { pattern: '*/Embfile.yml' },
              },
            },
          ],
        };

        await expect(validateUserConfig(config)).rejects.toThrow();
      });
    });
  });

  describe('unknown plugin', () => {
    test('unknown plugins pass schema validation (rejected at runtime)', async () => {
      const config = {
        ...validProject,
        plugins: [
          {
            name: 'unknown-plugin-that-does-not-exist',
            config: {},
          },
        ],
      };

      // Unknown plugins pass schema validation - they are rejected at runtime
      // when the plugin is loaded via getPlugin(). This allows for extensibility
      // where third-party plugins can be registered dynamically.
      const result = await validateUserConfig(config);

      expect(result.plugins).toHaveLength(1);
      expect(result.plugins![0].name).toBe(
        'unknown-plugin-that-does-not-exist',
      );
    });
  });
});
