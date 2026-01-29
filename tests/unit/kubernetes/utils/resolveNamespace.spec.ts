import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { resolveNamespace } from '@/kubernetes/utils/resolveNamespace.js';

describe('Kubernetes / Utils / resolveNamespace', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.K8S_NAMESPACE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('precedence', () => {
    test('CLI flag takes highest precedence', () => {
      process.env.K8S_NAMESPACE = 'env-namespace';

      const result = resolveNamespace({
        cliFlag: 'cli-namespace',
        config: 'config-namespace',
      });

      expect(result).toBe('cli-namespace');
    });

    test('K8S_NAMESPACE env takes precedence over config', () => {
      process.env.K8S_NAMESPACE = 'env-namespace';

      const result = resolveNamespace({
        config: 'config-namespace',
      });

      expect(result).toBe('env-namespace');
    });

    test('config takes precedence over default', () => {
      const result = resolveNamespace({
        config: 'config-namespace',
      });

      expect(result).toBe('config-namespace');
    });

    test('defaults to "default" when nothing specified', () => {
      const result = resolveNamespace({});

      expect(result).toBe('default');
    });
  });

  describe('empty values', () => {
    test('empty CLI flag falls back to env', () => {
      process.env.K8S_NAMESPACE = 'env-namespace';

      const result = resolveNamespace({
        cliFlag: '',
        config: 'config-namespace',
      });

      expect(result).toBe('env-namespace');
    });

    test('empty env falls back to config', () => {
      process.env.K8S_NAMESPACE = '';

      const result = resolveNamespace({
        config: 'config-namespace',
      });

      expect(result).toBe('config-namespace');
    });

    test('empty config falls back to default', () => {
      const result = resolveNamespace({
        config: '',
      });

      expect(result).toBe('default');
    });
  });

  describe('undefined values', () => {
    test('undefined CLI flag falls back to env', () => {
      process.env.K8S_NAMESPACE = 'env-namespace';

      const result = resolveNamespace({
        cliFlag: undefined,
        config: 'config-namespace',
      });

      expect(result).toBe('env-namespace');
    });

    test('undefined config falls back to default', () => {
      const result = resolveNamespace({
        cliFlag: undefined,
        config: undefined,
      });

      expect(result).toBe('default');
    });
  });
});
