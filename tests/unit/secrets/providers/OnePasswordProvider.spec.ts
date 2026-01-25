import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { OnePasswordError } from '@/secrets/providers/OnePasswordError.js';
import {
  OnePasswordProvider,
  OnePasswordProviderConfig,
} from '@/secrets/providers/OnePasswordProvider.js';

describe('Secrets / Providers / OnePasswordProvider', () => {
  let config: OnePasswordProviderConfig;
  let provider: OnePasswordProvider;
  let mockExecOp: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    config = {};
    provider = new OnePasswordProvider(config);
    mockExecOp = vi.spyOn(provider as never, 'execOp');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('#connect()', () => {
    test('is lazy - does not check op CLI until called', async () => {
      // Creating a provider should not trigger any op CLI calls
      const newProvider = new OnePasswordProvider({});
      const newMock = vi.spyOn(newProvider as never, 'execOp');

      // No calls yet
      expect(newMock).not.toHaveBeenCalled();
    });

    test('only connects once when called multiple times', async () => {
      mockExecOp.mockResolvedValue({
        stdout: JSON.stringify({ email: 'user@example.com' }),
        stderr: '',
      });

      await provider.connect();
      await provider.connect();
      await provider.connect();

      // Should only have called whoami once
      expect(mockExecOp).toHaveBeenCalledTimes(1);
    });

    test('succeeds when op whoami succeeds', async () => {
      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify({ email: 'user@example.com' }),
        stderr: '',
      });

      await provider.connect();

      expect(mockExecOp).toHaveBeenCalledWith(['whoami']);
    });

    test('includes account flag when configured', async () => {
      config = { account: 'my-team' };
      provider = new OnePasswordProvider(config);
      mockExecOp = vi.spyOn(provider as never, 'execOp');

      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify({ email: 'user@example.com' }),
        stderr: '',
      });

      await provider.connect();

      expect(mockExecOp).toHaveBeenCalledWith([
        'whoami',
        '--account',
        'my-team',
      ]);
    });

    test('throws OnePasswordError when op CLI not installed', async () => {
      const error = new Error('spawn op ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockExecOp.mockRejectedValue(error);

      await expect(provider.connect()).rejects.toThrow(OnePasswordError);
      await expect(provider.connect()).rejects.toThrow(
        '1Password CLI (op) not found',
      );
    });

    test('throws OnePasswordError when not signed in', async () => {
      const error = new Error('Not signed in') as NodeJS.ErrnoException & {
        stderr: string;
      };
      // Match actual error from op CLI: "[ERROR] 2026/01/24 12:47:29 account is not signed in"
      error.stderr = 'account is not signed in';
      mockExecOp.mockRejectedValue(error);

      await expect(provider.connect()).rejects.toThrow(OnePasswordError);
      await expect(provider.connect()).rejects.toThrow('Not signed in');
    });

    test('throws OnePasswordError on session expired', async () => {
      const error = new Error('Session expired') as NodeJS.ErrnoException & {
        stderr: string;
      };
      error.stderr = 'session expired';
      mockExecOp.mockRejectedValue(error);

      await expect(provider.connect()).rejects.toThrow('Not signed in');
    });
  });

  describe('#disconnect()', () => {
    test('clears the cache and resets connection', async () => {
      // First connect
      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify({ email: 'user@example.com' }),
        stderr: '',
      });
      await provider.connect();

      // Fetch a secret to populate cache
      const itemResponse = {
        id: 'item-id',
        title: 'test-item',
        vault: { id: 'vault-id', name: 'TestVault' },
        fields: [{ id: 'password', label: 'password', value: 'secret123' }],
      };
      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify(itemResponse),
        stderr: '',
      });
      await provider.get({ path: 'TestVault/test-item' });

      await provider.disconnect();

      // Fetch again should reconnect (whoami) and fetch again (cache was cleared)
      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify({ email: 'user@example.com' }),
        stderr: '',
      });
      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify(itemResponse),
        stderr: '',
      });
      await provider.get({ path: 'TestVault/test-item' });

      // Should have been called: whoami, get item, whoami (reconnect), get item again
      expect(mockExecOp).toHaveBeenCalledTimes(4);
    });
  });

  describe('#fetchSecret()', () => {
    beforeEach(async () => {
      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify({ email: 'user@example.com' }),
        stderr: '',
      });
      await provider.connect();
    });

    test('auto-connects when not yet connected', async () => {
      // Create a fresh provider that hasn't connected yet
      const newProvider = new OnePasswordProvider({});
      const newMock = vi.spyOn(newProvider as never, 'execOp');

      const itemResponse = {
        id: 'item-id',
        title: 'db-creds',
        vault: { id: 'vault-id', name: 'Production' },
        fields: [{ id: 'password', label: 'password', value: 'secret123' }],
      };

      // Mock both whoami (for connect) and item get (for fetch)
      newMock.mockResolvedValueOnce({
        stdout: JSON.stringify({ email: 'user@example.com' }),
        stderr: '',
      });
      newMock.mockResolvedValueOnce({
        stdout: JSON.stringify(itemResponse),
        stderr: '',
      });

      // Calling fetchSecret without explicit connect should work
      const result = await newProvider.fetchSecret({
        path: 'Production/db-creds',
      });

      expect(result).to.deep.equal({ password: 'secret123' });
      expect(newMock).toHaveBeenCalledTimes(2);
      expect(newMock).toHaveBeenNthCalledWith(1, ['whoami']);
    });

    test('parses vault/item path correctly', async () => {
      const itemResponse = {
        id: 'item-id',
        title: 'db-creds',
        vault: { id: 'vault-id', name: 'Production' },
        fields: [{ id: 'password', label: 'password', value: 'secret123' }],
      };
      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify(itemResponse),
        stderr: '',
      });

      await provider.fetchSecret({ path: 'Production/db-creds' });

      expect(mockExecOp).toHaveBeenCalledWith([
        'item',
        'get',
        'db-creds',
        '--vault',
        'Production',
        '--format',
        'json',
      ]);
    });

    test('includes account flag when configured', async () => {
      config = { account: 'my-team' };
      provider = new OnePasswordProvider(config);
      mockExecOp = vi.spyOn(provider as never, 'execOp');

      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify({ email: 'user@example.com' }),
        stderr: '',
      });
      await provider.connect();

      const itemResponse = {
        id: 'item-id',
        title: 'db-creds',
        vault: { id: 'vault-id', name: 'Production' },
        fields: [],
      };
      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify(itemResponse),
        stderr: '',
      });

      await provider.fetchSecret({ path: 'Production/db-creds' });

      expect(mockExecOp).toHaveBeenCalledWith([
        'item',
        'get',
        'db-creds',
        '--vault',
        'Production',
        '--format',
        'json',
        '--account',
        'my-team',
      ]);
    });

    test('returns all fields from item', async () => {
      const itemResponse = {
        id: 'item-id',
        title: 'db-creds',
        vault: { id: 'vault-id', name: 'Production' },
        fields: [
          { id: 'username', label: 'username', value: 'admin' },
          { id: 'password', label: 'password', value: 'secret123' },
          { id: 'notesPlain', label: 'notes', value: 'Some notes' },
        ],
      };
      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify(itemResponse),
        stderr: '',
      });

      const result = await provider.fetchSecret({
        path: 'Production/db-creds',
      });

      expect(result).to.deep.equal({
        username: 'admin',
        password: 'secret123',
        notes: 'Some notes',
      });
    });

    test('uses field id when label is missing', async () => {
      const itemResponse = {
        id: 'item-id',
        title: 'db-creds',
        vault: { id: 'vault-id', name: 'Production' },
        fields: [{ id: 'field-id-123', value: 'some-value' }],
      };
      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify(itemResponse),
        stderr: '',
      });

      const result = await provider.fetchSecret({
        path: 'Production/db-creds',
      });

      expect(result).to.deep.equal({
        'field-id-123': 'some-value',
      });
    });

    test('throws OnePasswordError for invalid path format', async () => {
      await expect(
        provider.fetchSecret({ path: 'invalid-path-no-slash' }),
      ).rejects.toThrow(OnePasswordError);
      await expect(
        provider.fetchSecret({ path: 'invalid-path-no-slash' }),
      ).rejects.toThrow('Expected format: vault/item');
    });

    test('throws OnePasswordError when vault not found', async () => {
      const error = new Error('Vault not found') as NodeJS.ErrnoException & {
        stderr: string;
      };
      error.stderr = "isn't a vault in this account";
      mockExecOp.mockRejectedValue(error);

      await expect(
        provider.fetchSecret({ path: 'NonExistent/item' }),
      ).rejects.toThrow(OnePasswordError);
      await expect(
        provider.fetchSecret({ path: 'NonExistent/item' }),
      ).rejects.toThrow("Vault 'NonExistent' not found");
    });

    test('throws OnePasswordError when item not found', async () => {
      const error = new Error('Item not found') as NodeJS.ErrnoException & {
        stderr: string;
      };
      error.stderr = "isn't an item in the vault";
      mockExecOp.mockRejectedValue(error);

      await expect(
        provider.fetchSecret({ path: 'Production/nonexistent' }),
      ).rejects.toThrow(OnePasswordError);
      await expect(
        provider.fetchSecret({ path: 'Production/nonexistent' }),
      ).rejects.toThrow("Item 'nonexistent' not found");
    });
  });

  describe('#get()', () => {
    beforeEach(async () => {
      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify({ email: 'user@example.com' }),
        stderr: '',
      });
      await provider.connect();

      const itemResponse = {
        id: 'item-id',
        title: 'db-creds',
        vault: { id: 'vault-id', name: 'Production' },
        fields: [
          { id: 'username', label: 'username', value: 'admin' },
          { id: 'password', label: 'password', value: 'secret123' },
        ],
      };
      mockExecOp.mockResolvedValueOnce({
        stdout: JSON.stringify(itemResponse),
        stderr: '',
      });
    });

    test('returns entire secret when no key specified', async () => {
      const result = await provider.get({ path: 'Production/db-creds' });
      expect(result).to.deep.equal({
        username: 'admin',
        password: 'secret123',
      });
    });

    test('returns specific field when key specified', async () => {
      const result = await provider.get({
        path: 'Production/db-creds',
        key: 'password',
      });
      expect(result).to.equal('secret123');
    });

    test('throws error when field not found', async () => {
      await expect(
        provider.get({ path: 'Production/db-creds', key: 'nonexistent' }),
      ).rejects.toThrow("Key 'nonexistent' not found in secret");
    });
  });
});
