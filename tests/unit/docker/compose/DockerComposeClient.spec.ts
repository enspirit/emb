import { Monorepo } from '@';
import { describe, expect, test } from 'vitest';

import { DefaultGetContainerOptions, DockerComposeClient } from '@/docker';

/**
 * Note: Full testing of DockerComposeClient requires mocking `execa` which is
 * challenging in ESM. These tests cover the instantiation and type exports.
 * Integration tests should be used for testing the actual docker compose interactions.
 */
describe('Docker / DockerComposeClient', () => {
  describe('instantiation', () => {
    test('it can be instantiated with a monorepo', () => {
      const mockMonorepo = {
        rootDir: '/test/project',
      } as unknown as Monorepo;

      const client = new DockerComposeClient(mockMonorepo);

      expect(client).toBeInstanceOf(DockerComposeClient);
    });
  });

  describe('DefaultGetContainerOptions', () => {
    test('it has mustBeRunning set to true by default', () => {
      expect(DefaultGetContainerOptions.mustBeRunning).toBe(true);
    });

    test('it has mustBeUnique set to true by default', () => {
      expect(DefaultGetContainerOptions.mustBeUnique).toBe(true);
    });
  });
});
