import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  validateEmbfile,
  validateUserConfig,
} from '../../../src/config/validation.js';
import { ConfigValidationError } from '../../../src/errors.js';

const configWithResourceTrigger = (rebuildTrigger: unknown) => ({
  project: { name: 'proj' },
  components: {
    api: {
      resources: {
        image: {
          type: 'docker/image',
          params: { dockerfile: 'Dockerfile' },
          rebuildTrigger,
        },
      },
    },
  },
});

const configWithFlavorDefaults = (flavorDefaults: unknown) => ({
  project: { name: 'proj' },
  flavors: {
    dev: {
      defaults: flavorDefaults,
    },
  },
});

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
        ConfigValidationError,
      );
    });

    test('it includes validation details in error message', async () => {
      const invalidConfig = {
        components: {},
      };

      try {
        await validateUserConfig(invalidConfig);
        expect.fail('should have thrown');
      } catch (error_) {
        expect(error_).to.be.instanceOf(ConfigValidationError);
        const error = error_ as ConfigValidationError;
        expect(error.message).to.include('.emb.yml is invalid');
        expect(error.message).to.include(
          "must have required property 'project'",
        );
        expect(error.fileErrors).to.have.length(1);
        expect(error.fileErrors[0].file).to.equal('.emb.yml');
      }
    });

    test('it includes file path in error when validating from file', async () => {
      const configPath = join(tempDir, '.emb.yml');
      await writeFile(configPath, 'components: {}\n');

      try {
        await validateUserConfig(configPath);
        expect.fail('should have thrown');
      } catch (error_) {
        expect(error_).to.be.instanceOf(ConfigValidationError);
        const error = error_ as ConfigValidationError;
        expect(error.fileErrors[0].file).to.equal(configPath);
      }
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

    test('it throws ConfigValidationError with details on invalid component', async () => {
      const component = {
        unknownField: 'bad',
      };

      try {
        await validateEmbfile(component);
        expect.fail('should have thrown');
      } catch (error_) {
        expect(error_).to.be.instanceOf(ConfigValidationError);
        const error = error_ as ConfigValidationError;
        expect(error.message).to.include('Embfile is invalid');
        expect(error.message).to.include("unknown property 'unknownField'");
      }
    });

    test('it includes file path in error when validating from file', async () => {
      const embfilePath = join(tempDir, 'Embfile.yaml');
      await writeFile(embfilePath, 'unknownField: bad\n');

      try {
        await validateEmbfile(embfilePath);
        expect.fail('should have thrown');
      } catch (error_) {
        expect(error_).to.be.instanceOf(ConfigValidationError);
        const error = error_ as ConfigValidationError;
        expect(error.fileErrors[0].file).to.equal(embfilePath);
      }
    });
  });

  describe('rebuildTrigger on resources', () => {
    test('it accepts a resource without rebuildTrigger', async () => {
      const config = {
        project: { name: 'proj' },
        components: {
          api: {
            resources: {
              image: {
                type: 'docker/image',
                params: { dockerfile: 'Dockerfile' },
              },
            },
          },
        },
      };

      await expect(validateUserConfig(config)).resolves.toBeDefined();
    });

    test('it accepts strategy=auto', async () => {
      const config = configWithResourceTrigger({ strategy: 'auto' });

      await expect(validateUserConfig(config)).resolves.toBeDefined();
    });

    test('it accepts strategy=always', async () => {
      const config = configWithResourceTrigger({ strategy: 'always' });

      await expect(validateUserConfig(config)).resolves.toBeDefined();
    });

    test('it accepts strategy=watch-paths with a non-empty paths array', async () => {
      const config = configWithResourceTrigger({
        strategy: 'watch-paths',
        paths: ['Dockerfile', 'package.json', '/pnpm-lock.yaml'],
      });

      await expect(validateUserConfig(config)).resolves.toBeDefined();
    });

    test('it rejects an unknown strategy value', async () => {
      const config = configWithResourceTrigger({ strategy: 'never' });

      await expect(validateUserConfig(config)).rejects.toThrow(
        ConfigValidationError,
      );
    });

    test('it rejects watch-paths without a paths field', async () => {
      const config = configWithResourceTrigger({ strategy: 'watch-paths' });

      await expect(validateUserConfig(config)).rejects.toThrow(
        ConfigValidationError,
      );
    });

    test('it rejects watch-paths with an empty paths array', async () => {
      const config = configWithResourceTrigger({
        strategy: 'watch-paths',
        paths: [],
      });

      await expect(validateUserConfig(config)).rejects.toThrow(
        ConfigValidationError,
      );
    });

    test('it rejects always with a stray paths field', async () => {
      const config = configWithResourceTrigger({
        strategy: 'always',
        paths: ['Dockerfile'],
      });

      await expect(validateUserConfig(config)).rejects.toThrow(
        ConfigValidationError,
      );
    });

    test('it rejects a missing strategy field', async () => {
      const config = configWithResourceTrigger({ paths: ['Dockerfile'] });

      await expect(validateUserConfig(config)).rejects.toThrow(
        ConfigValidationError,
      );
    });
  });

  describe('flavors.defaults.rebuildPolicy', () => {
    test('it accepts a flavor without defaults', async () => {
      const config = {
        project: { name: 'proj' },
        flavors: { dev: { patches: [] } },
      };

      await expect(validateUserConfig(config)).resolves.toBeDefined();
    });

    test('it accepts a flavor default for docker/image', async () => {
      const config = configWithFlavorDefaults({
        rebuildPolicy: {
          'docker/image': {
            strategy: 'watch-paths',
            paths: ['Dockerfile', '/pnpm-lock.yaml'],
          },
        },
      });

      await expect(validateUserConfig(config)).resolves.toBeDefined();
    });

    test('it rejects rebuildPolicy for an unsupported resource type', async () => {
      const config = configWithFlavorDefaults({
        rebuildPolicy: {
          file: { strategy: 'auto' },
        },
      });

      await expect(validateUserConfig(config)).rejects.toThrow(
        ConfigValidationError,
      );
    });

    test('it rejects an invalid strategy under flavor defaults', async () => {
      const config = configWithFlavorDefaults({
        rebuildPolicy: {
          'docker/image': { strategy: 'never' },
        },
      });

      await expect(validateUserConfig(config)).rejects.toThrow(
        ConfigValidationError,
      );
    });

    test('it rejects unknown keys under flavor defaults', async () => {
      const config = configWithFlavorDefaults({
        rebuildPolicy: {
          'docker/image': { strategy: 'auto' },
        },
        unknownField: true,
      });

      await expect(validateUserConfig(config)).rejects.toThrow(
        ConfigValidationError,
      );
    });
  });
});
