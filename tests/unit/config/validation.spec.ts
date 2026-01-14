import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  validateEmbfile,
  validateUserConfig,
} from '../../../src/config/validation.js';

describe('Config / Validation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embValidationTest'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('validateUserConfig()', () => {
    test('it validates a valid config object', async () => {
      const config = {
        project: {
          name: 'test-project',
        },
        components: {},
      };

      const result = await validateUserConfig(config);

      expect(result).toEqual(config);
    });

    test('it validates a config from a YAML file', async () => {
      const configPath = join(tempDir, '.emb.yml');
      await writeFile(
        configPath,
        `
project:
  name: file-test
components: {}
`,
      );

      const result = await validateUserConfig(configPath);

      expect(result.project.name).toBe('file-test');
    });

    test('it throws when config object is invalid', async () => {
      const invalidConfig = {
        // missing required 'project' field
        components: {},
      };

      await expect(validateUserConfig(invalidConfig)).rejects.toThrow(
        'Your .emb.yml is incorrect',
      );
    });

    test('it throws when file does not exist', async () => {
      const nonExistentPath = join(tempDir, 'nonexistent.yml');

      await expect(validateUserConfig(nonExistentPath)).rejects.toThrow();
    });

    test('it validates config with all optional fields', async () => {
      const fullConfig = {
        project: {
          name: 'full-project',
          rootDir: 'src',
        },
        plugins: [],
        env: {
          NODE_ENV: 'test',
        },
        vars: {
          version: '1.0.0',
        },
        components: {
          api: {
            tasks: {
              build: { script: 'npm run build' },
            },
          },
        },
        flavors: {
          production: {
            patches: [],
          },
        },
      };

      const result = await validateUserConfig(fullConfig);

      expect(result.project.name).toBe('full-project');
      expect(result.env).toEqual({ NODE_ENV: 'test' });
    });
  });

  describe('validateEmbfile()', () => {
    test('it validates a valid component config object', async () => {
      const component = {
        tasks: {
          build: { script: 'npm run build' },
        },
      };

      const result = await validateEmbfile(component);

      expect(result).toEqual(component);
    });

    test('it validates a component from a YAML file', async () => {
      const embfilePath = join(tempDir, 'Embfile.yaml');
      await writeFile(
        embfilePath,
        `
tasks:
  test:
    script: npm test
`,
      );

      const result = await validateEmbfile(embfilePath);

      expect(result.tasks?.test?.script).toBe('npm test');
    });

    test('it returns empty object for null/undefined component', async () => {
      const result = await validateEmbfile(null);

      expect(result).toEqual({});
    });

    test('it throws when file does not exist', async () => {
      const nonExistentPath = join(tempDir, 'nonexistent.yml');

      await expect(validateEmbfile(nonExistentPath)).rejects.toThrow();
    });

    test('it validates component with resources', async () => {
      const component = {
        resources: {
          image: {
            type: 'docker/image',
            params: {
              context: '.',
            },
          },
        },
      };

      const result = await validateEmbfile(component);

      expect(result.resources?.image?.type).toBe('docker/image');
    });

    test('it validates component with flavors', async () => {
      const component = {
        flavors: {
          production: {
            patches: [{ op: 'replace', path: '/rootDir', value: 'prod' }],
          },
        },
      };

      const result = await validateEmbfile(component);

      expect(result.flavors?.production?.patches).toHaveLength(1);
    });
  });
});
