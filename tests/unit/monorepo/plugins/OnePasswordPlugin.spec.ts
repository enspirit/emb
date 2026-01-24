import { OnePasswordPlugin, OnePasswordPluginConfig } from '@';
import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { OnePasswordProvider } from '@/secrets/providers/OnePasswordProvider.js';

describe('Monorepo / Plugins / OnePasswordPlugin', () => {
  let setup: TestSetup;

  beforeEach(async () => {
    setup = await createTestSetup({
      tempDirPrefix: 'embOnePasswordPluginTest',
      embfile: { project: { name: 'test-op' }, plugins: [], components: {} },
    });
  });

  afterEach(async () => {
    await setup.cleanup();
    vi.restoreAllMocks();
  });

  describe('#init()', () => {
    test('connects to 1Password and registers provider', async () => {
      const config: OnePasswordPluginConfig = {};

      // Mock the execOp method on the prototype
      const mockExecOp = vi
        .spyOn(OnePasswordProvider.prototype as never, 'execOp')
        .mockResolvedValue({
          stdout: JSON.stringify({ email: 'user@example.com' }),
          stderr: '',
        });

      const plugin = new OnePasswordPlugin(config, setup.monorepo);
      await plugin.init();

      expect(setup.secrets.has('op')).to.equal(true);
      expect(mockExecOp).toHaveBeenCalledWith(['whoami']);
    });

    test('works when config is undefined', async () => {
      // Mock the execOp method on the prototype
      const mockExecOp = vi
        .spyOn(OnePasswordProvider.prototype as never, 'execOp')
        .mockResolvedValue({
          stdout: JSON.stringify({ email: 'user@example.com' }),
          stderr: '',
        });

      // Pass undefined as config (simulates no config block in .emb.yml)
      const plugin = new OnePasswordPlugin(
        undefined as unknown as OnePasswordPluginConfig,
        setup.monorepo,
      );
      await plugin.init();

      expect(setup.secrets.has('op')).to.equal(true);
      expect(mockExecOp).toHaveBeenCalledWith(['whoami']);
    });

    test('uses account from config', async () => {
      const config: OnePasswordPluginConfig = {
        account: 'my-team',
      };

      const mockExecOp = vi
        .spyOn(OnePasswordProvider.prototype as never, 'execOp')
        .mockResolvedValue({
          stdout: JSON.stringify({ email: 'user@example.com' }),
          stderr: '',
        });

      const plugin = new OnePasswordPlugin(config, setup.monorepo);
      await plugin.init();

      expect(mockExecOp).toHaveBeenCalledWith([
        'whoami',
        '--account',
        'my-team',
      ]);
    });

    test('uses OP_ACCOUNT from environment when account not specified', async () => {
      const originalEnv = process.env.OP_ACCOUNT;
      process.env.OP_ACCOUNT = 'env-team';

      const config: OnePasswordPluginConfig = {};

      const mockExecOp = vi
        .spyOn(OnePasswordProvider.prototype as never, 'execOp')
        .mockResolvedValue({
          stdout: JSON.stringify({ email: 'user@example.com' }),
          stderr: '',
        });

      const plugin = new OnePasswordPlugin(config, setup.monorepo);
      await plugin.init();

      expect(mockExecOp).toHaveBeenCalledWith([
        'whoami',
        '--account',
        'env-team',
      ]);

      process.env.OP_ACCOUNT = originalEnv;
    });

    test('throws error when op CLI not found', async () => {
      const config: OnePasswordPluginConfig = {};

      const error = new Error('spawn op ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.spyOn(
        OnePasswordProvider.prototype as never,
        'execOp',
      ).mockRejectedValue(error);

      const plugin = new OnePasswordPlugin(config, setup.monorepo);
      await expect(plugin.init()).rejects.toThrow(
        '1Password CLI (op) not found',
      );
    });

    test('throws error when not signed in', async () => {
      const config: OnePasswordPluginConfig = {};

      const error = new Error('Not signed in') as NodeJS.ErrnoException & {
        stderr: string;
      };
      // Match actual error from op CLI: "[ERROR] 2026/01/24 12:47:29 account is not signed in"
      error.stderr = 'account is not signed in';
      vi.spyOn(
        OnePasswordProvider.prototype as never,
        'execOp',
      ).mockRejectedValue(error);

      const plugin = new OnePasswordPlugin(config, setup.monorepo);
      await expect(plugin.init()).rejects.toThrow('Not signed in to 1Password');
    });
  });
});
