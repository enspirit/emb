import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  cacheToken,
  CachedToken,
  clearCachedToken,
  getCachedToken,
  hasCachedToken,
} from '@/secrets/providers/VaultTokenCache.js';

describe('Secrets / Providers / VaultTokenCache', () => {
  let testCacheDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testCacheDir = join(tmpdir(), `emb-test-cache-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testCacheDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  describe('#cacheToken()', () => {
    test('creates cache file with correct structure', async () => {
      const vaultAddress = 'https://vault.example.com';
      const token = 'test-token-123';
      const ttlSeconds = 3600;

      await cacheToken(vaultAddress, token, ttlSeconds, undefined, {
        cacheDir: testCacheDir,
      });

      // Verify a file was created
      const files = await import('node:fs/promises').then((fs) =>
        fs.readdir(testCacheDir),
      );
      expect(files).toHaveLength(1);

      // Verify file contents
      const content = await readFile(join(testCacheDir, files[0]), 'utf8');
      const cached = JSON.parse(content) as CachedToken;

      expect(cached.token).toBe(token);
      expect(cached.vaultAddress).toBe(vaultAddress);
      expect(cached.namespace).toBeUndefined();
      expect(cached.expiresAt).toBeGreaterThan(Date.now());
      expect(cached.createdAt).toBeLessThanOrEqual(Date.now());
    });

    test('includes namespace in cache when provided', async () => {
      const vaultAddress = 'https://vault.example.com';
      const namespace = 'my-namespace';

      await cacheToken(vaultAddress, 'token', 3600, namespace, {
        cacheDir: testCacheDir,
      });

      const files = await import('node:fs/promises').then((fs) =>
        fs.readdir(testCacheDir),
      );
      const content = await readFile(join(testCacheDir, files[0]), 'utf8');
      const cached = JSON.parse(content) as CachedToken;

      expect(cached.namespace).toBe(namespace);
    });

    test('creates separate cache files for different namespaces', async () => {
      const vaultAddress = 'https://vault.example.com';

      await cacheToken(vaultAddress, 'token1', 3600, undefined, {
        cacheDir: testCacheDir,
      });
      await cacheToken(vaultAddress, 'token2', 3600, 'namespace-a', {
        cacheDir: testCacheDir,
      });
      await cacheToken(vaultAddress, 'token3', 3600, 'namespace-b', {
        cacheDir: testCacheDir,
      });

      const files = await import('node:fs/promises').then((fs) =>
        fs.readdir(testCacheDir),
      );
      expect(files).toHaveLength(3);
    });
  });

  describe('#getCachedToken()', () => {
    test('returns null when no cache file exists', async () => {
      const result = await getCachedToken('https://vault.example.com', undefined, {
        cacheDir: testCacheDir,
      });

      expect(result).toBeNull();
    });

    test('returns cached token when valid', async () => {
      const vaultAddress = 'https://vault.example.com';
      const token = 'my-cached-token';

      await cacheToken(vaultAddress, token, 3600, undefined, {
        cacheDir: testCacheDir,
      });

      const result = await getCachedToken(vaultAddress, undefined, {
        cacheDir: testCacheDir,
      });

      expect(result).not.toBeNull();
      expect(result?.token).toBe(token);
      expect(result?.vaultAddress).toBe(vaultAddress);
    });

    test('returns null when token is expired', async () => {
      const vaultAddress = 'https://vault.example.com';

      // Create a token that's already expired (TTL of 0)
      await cacheToken(vaultAddress, 'expired-token', 0, undefined, {
        cacheDir: testCacheDir,
      });

      const result = await getCachedToken(vaultAddress, undefined, {
        cacheDir: testCacheDir,
      });

      expect(result).toBeNull();
    });

    test('returns null when token is within expiry buffer', async () => {
      const vaultAddress = 'https://vault.example.com';

      // Create a token that expires in 2 minutes (less than default 5 min buffer)
      await cacheToken(vaultAddress, 'expiring-token', 120, undefined, {
        cacheDir: testCacheDir,
      });

      const result = await getCachedToken(vaultAddress, undefined, {
        cacheDir: testCacheDir,
        expiryBuffer: 5 * 60 * 1000, // 5 minutes
      });

      expect(result).toBeNull();
    });

    test('returns token when within custom smaller expiry buffer', async () => {
      const vaultAddress = 'https://vault.example.com';

      // Create a token that expires in 2 minutes
      await cacheToken(vaultAddress, 'valid-token', 120, undefined, {
        cacheDir: testCacheDir,
      });

      const result = await getCachedToken(vaultAddress, undefined, {
        cacheDir: testCacheDir,
        expiryBuffer: 60 * 1000, // 1 minute buffer
      });

      expect(result).not.toBeNull();
      expect(result?.token).toBe('valid-token');
    });

    test('returns correct token for namespace', async () => {
      const vaultAddress = 'https://vault.example.com';

      await cacheToken(vaultAddress, 'root-token', 3600, undefined, {
        cacheDir: testCacheDir,
      });
      await cacheToken(vaultAddress, 'ns-token', 3600, 'my-namespace', {
        cacheDir: testCacheDir,
      });

      const rootResult = await getCachedToken(vaultAddress, undefined, {
        cacheDir: testCacheDir,
      });
      const nsResult = await getCachedToken(vaultAddress, 'my-namespace', {
        cacheDir: testCacheDir,
      });

      expect(rootResult?.token).toBe('root-token');
      expect(nsResult?.token).toBe('ns-token');
    });

    test('returns null for wrong namespace', async () => {
      const vaultAddress = 'https://vault.example.com';

      await cacheToken(vaultAddress, 'token', 3600, 'namespace-a', {
        cacheDir: testCacheDir,
      });

      const result = await getCachedToken(vaultAddress, 'namespace-b', {
        cacheDir: testCacheDir,
      });

      expect(result).toBeNull();
    });

    test('returns null for corrupted cache file', async () => {
      const vaultAddress = 'https://vault.example.com';

      // First cache a valid token to get the filename
      await cacheToken(vaultAddress, 'token', 3600, undefined, {
        cacheDir: testCacheDir,
      });

      // Find and corrupt the file
      const files = await import('node:fs/promises').then((fs) =>
        fs.readdir(testCacheDir),
      );
      await writeFile(join(testCacheDir, files[0]), 'not valid json', 'utf8');

      const result = await getCachedToken(vaultAddress, undefined, {
        cacheDir: testCacheDir,
      });

      expect(result).toBeNull();
    });
  });

  describe('#clearCachedToken()', () => {
    test('removes cached token file', async () => {
      const vaultAddress = 'https://vault.example.com';

      await cacheToken(vaultAddress, 'token', 3600, undefined, {
        cacheDir: testCacheDir,
      });

      // Verify file exists
      let files = await import('node:fs/promises').then((fs) =>
        fs.readdir(testCacheDir),
      );
      expect(files).toHaveLength(1);

      await clearCachedToken(vaultAddress, undefined, {
        cacheDir: testCacheDir,
      });

      // Verify file is removed
      files = await import('node:fs/promises').then((fs) =>
        fs.readdir(testCacheDir),
      );
      expect(files).toHaveLength(0);
    });

    test('does not throw when file does not exist', async () => {
      await expect(
        clearCachedToken('https://nonexistent.com', undefined, {
          cacheDir: testCacheDir,
        }),
      ).resolves.not.toThrow();
    });

    test('only clears token for specific namespace', async () => {
      const vaultAddress = 'https://vault.example.com';

      await cacheToken(vaultAddress, 'token1', 3600, undefined, {
        cacheDir: testCacheDir,
      });
      await cacheToken(vaultAddress, 'token2', 3600, 'namespace-a', {
        cacheDir: testCacheDir,
      });

      await clearCachedToken(vaultAddress, 'namespace-a', {
        cacheDir: testCacheDir,
      });

      // Root namespace token should still exist
      const rootResult = await getCachedToken(vaultAddress, undefined, {
        cacheDir: testCacheDir,
      });
      const nsResult = await getCachedToken(vaultAddress, 'namespace-a', {
        cacheDir: testCacheDir,
      });

      expect(rootResult).not.toBeNull();
      expect(nsResult).toBeNull();
    });
  });

  describe('#hasCachedToken()', () => {
    test('returns true when valid token exists', async () => {
      const vaultAddress = 'https://vault.example.com';

      await cacheToken(vaultAddress, 'token', 3600, undefined, {
        cacheDir: testCacheDir,
      });

      const result = await hasCachedToken(vaultAddress, undefined, {
        cacheDir: testCacheDir,
      });

      expect(result).toBe(true);
    });

    test('returns false when no token exists', async () => {
      const result = await hasCachedToken('https://vault.example.com', undefined, {
        cacheDir: testCacheDir,
      });

      expect(result).toBe(false);
    });

    test('returns false when token is expired', async () => {
      const vaultAddress = 'https://vault.example.com';

      await cacheToken(vaultAddress, 'token', 0, undefined, {
        cacheDir: testCacheDir,
      });

      const result = await hasCachedToken(vaultAddress, undefined, {
        cacheDir: testCacheDir,
      });

      expect(result).toBe(false);
    });
  });
});
