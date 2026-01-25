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
    test('registers provider without checking op CLI (lazy connection)', async () => {
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

      // Provider should be registered
      expect(setup.secrets.has('op')).to.equal(true);
      // But op CLI should NOT have been called yet (lazy connection)
      expect(mockExecOp).not.toHaveBeenCalled();
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

      // Provider should be registered
      expect(setup.secrets.has('op')).to.equal(true);
      // But op CLI should NOT have been called yet (lazy connection)
      expect(mockExecOp).not.toHaveBeenCalled();
    });

    test('op CLI check is deferred until secret is fetched', async () => {
      const config: OnePasswordPluginConfig = {
        account: 'my-team',
      };

      const itemResponse = {
        id: 'item-id',
        title: 'db-creds',
        vault: { id: 'vault-id', name: 'Production' },
        fields: [{ id: 'password', label: 'password', value: 'secret123' }],
      };

      const mockExecOp = vi
        .spyOn(OnePasswordProvider.prototype as never, 'execOp')
        .mockResolvedValueOnce({
          stdout: JSON.stringify({ email: 'user@example.com' }),
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: JSON.stringify(itemResponse),
          stderr: '',
        });

      const plugin = new OnePasswordPlugin(config, setup.monorepo);
      await plugin.init();

      // No calls yet during init
      expect(mockExecOp).not.toHaveBeenCalled();

      // Now fetch a secret - this triggers the connection
      const provider = setup.secrets.get('op');
      await provider!.get({ path: 'Production/db-creds', key: 'password' });

      // Now whoami should have been called with account
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

      const itemResponse = {
        id: 'item-id',
        title: 'db-creds',
        vault: { id: 'vault-id', name: 'Production' },
        fields: [{ id: 'password', label: 'password', value: 'secret123' }],
      };

      const mockExecOp = vi
        .spyOn(OnePasswordProvider.prototype as never, 'execOp')
        .mockResolvedValueOnce({
          stdout: JSON.stringify({ email: 'user@example.com' }),
          stderr: '',
        })
        .mockResolvedValueOnce({
          stdout: JSON.stringify(itemResponse),
          stderr: '',
        });

      const plugin = new OnePasswordPlugin(config, setup.monorepo);
      await plugin.init();

      // Fetch a secret to trigger connection
      const provider = setup.secrets.get('op');
      await provider!.get({ path: 'Production/db-creds', key: 'password' });

      expect(mockExecOp).toHaveBeenCalledWith([
        'whoami',
        '--account',
        'env-team',
      ]);

      process.env.OP_ACCOUNT = originalEnv;
    });

    test('error when op CLI not found is deferred until secret is fetched', async () => {
      const config: OnePasswordPluginConfig = {};

      const error = new Error('spawn op ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.spyOn(
        OnePasswordProvider.prototype as never,
        'execOp',
      ).mockRejectedValue(error);

      const plugin = new OnePasswordPlugin(config, setup.monorepo);
      // init() should succeed - no op CLI check yet
      await plugin.init();

      // But fetching a secret should fail
      const provider = setup.secrets.get('op');
      await expect(
        provider!.get({ path: 'Production/db-creds' }),
      ).rejects.toThrow('1Password CLI (op) not found');
    });

    test('error when not signed in is deferred until secret is fetched', async () => {
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
      // init() should succeed - no op CLI check yet
      await plugin.init();

      // But fetching a secret should fail
      const provider = setup.secrets.get('op');
      await expect(
        provider!.get({ path: 'Production/db-creds' }),
      ).rejects.toThrow('Not signed in to 1Password');
    });
  });
});
