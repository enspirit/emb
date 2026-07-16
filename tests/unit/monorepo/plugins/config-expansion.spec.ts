import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { EMBConfig } from '@/config';

import { Monorepo, MonorepoConfig, registerPlugin } from '@/monorepo';

// A throwaway plugin that records the config object it was constructed with, so
// we can assert that Monorepo expanded ${env:...} templates in the plugins
// section before the plugin ever saw the value (report finding #37). It is
// declared as a plain, structurally-compatible class (constructor + static
// name + init) to keep the test decoupled from the AbstractPlugin base.
const captured: { config?: unknown } = {};

class ConfigCapturePlugin {
  static name = 'test-config-capture';

  constructor(
    private config: { address?: string },
    _monorepo: unknown,
  ) {}

  async init(): Promise<void> {
    captured.config = this.config;
  }
}

// registerPlugin throws on a duplicate name; guard so a watch-mode re-run of
// this file does not abort at import time.
try {
  registerPlugin(ConfigCapturePlugin as never);
} catch {
  // already registered
}

const configWith = (address: string): EMBConfig => ({
  project: { name: 'test' },
  plugins: [{ name: 'test-config-capture', config: { address } }],
  components: {},
});

describe('Monorepo / plugin config expansion', () => {
  const original = process.env.TEST_VAULT_ADDR;

  beforeEach(() => {
    captured.config = undefined;
    delete process.env.TEST_VAULT_ADDR;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.TEST_VAULT_ADDR;
    } else {
      process.env.TEST_VAULT_ADDR = original;
    }
  });

  test('expands env-var templates in plugin config before the plugin receives it', async () => {
    process.env.TEST_VAULT_ADDR = 'http://vault.internal:8200';

    const repo = new Monorepo(
      new MonorepoConfig(
        // eslint-disable-next-line no-template-curly-in-string
        configWith('${env:TEST_VAULT_ADDR:-http://localhost:8200}'),
      ),
      '/tmp',
    );
    await repo.init();

    expect(captured.config).to.deep.equal({
      address: 'http://vault.internal:8200',
    });
  });

  test('falls back to the template default when the env var is unset', async () => {
    const repo = new Monorepo(
      new MonorepoConfig(
        // eslint-disable-next-line no-template-curly-in-string
        configWith('${env:TEST_VAULT_ADDR:-http://localhost:8200}'),
      ),
      '/tmp',
    );
    await repo.init();

    expect(captured.config).to.deep.equal({
      address: 'http://localhost:8200',
    });
  });
});
