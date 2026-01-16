import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Cached token metadata stored on disk.
 */
export interface CachedToken {
  /** The Vault client token */
  token: string;
  /** Unix timestamp (ms) when the token expires */
  expiresAt: number;
  /** Unix timestamp (ms) when the token was cached */
  createdAt: number;
  /** Vault namespace (if any) */
  namespace?: string;
  /** Vault address this token is for */
  vaultAddress: string;
}

/**
 * Options for token caching.
 */
export interface TokenCacheOptions {
  /** Buffer time in ms before expiry to consider token invalid (default: 5 minutes) */
  expiryBuffer?: number;
  /** Custom cache directory (default: ~/.emb/vault-tokens) */
  cacheDir?: string;
}

const DEFAULT_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CACHE_DIR = join(homedir(), '.emb', 'vault-tokens');

/**
 * Generate a cache key for a Vault address and namespace combination.
 * Uses a hash to create safe filenames.
 */
function getCacheKey(vaultAddress: string, namespace?: string): string {
  const input = namespace ? `${vaultAddress}::${namespace}` : vaultAddress;
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/**
 * Get the path to the cache file for a given Vault address.
 */
function getCachePath(
  vaultAddress: string,
  namespace?: string,
  cacheDir = DEFAULT_CACHE_DIR,
): string {
  const key = getCacheKey(vaultAddress, namespace);
  return join(cacheDir, `${key}.json`);
}

/**
 * Retrieve a cached token if it exists and is still valid.
 *
 * @param vaultAddress - The Vault server address
 * @param namespace - Optional Vault namespace
 * @param options - Cache options
 * @returns The cached token or null if not found/expired
 */
export async function getCachedToken(
  vaultAddress: string,
  namespace?: string,
  options: TokenCacheOptions = {},
): Promise<CachedToken | null> {
  const { expiryBuffer = DEFAULT_EXPIRY_BUFFER, cacheDir } = options;
  const cachePath = getCachePath(vaultAddress, namespace, cacheDir);

  try {
    const content = await readFile(cachePath, 'utf8');
    const cached = JSON.parse(content) as CachedToken;

    // Verify the cached token matches the requested address/namespace
    if (
      cached.vaultAddress !== vaultAddress ||
      cached.namespace !== namespace
    ) {
      return null;
    }

    // Check if token is expired or close to expiry
    const now = Date.now();
    if (cached.expiresAt - expiryBuffer <= now) {
      // Token is expired or about to expire, clear it
      await clearCachedToken(vaultAddress, namespace, options);
      return null;
    }

    return cached;
  } catch {
    // File doesn't exist or is invalid
    return null;
  }
}

/**
 * Cache a Vault token to disk.
 *
 * @param vaultAddress - The Vault server address
 * @param token - The Vault client token
 * @param ttlSeconds - Token TTL in seconds (from Vault's lease_duration)
 * @param namespace - Optional Vault namespace
 * @param options - Cache options
 */
export async function cacheToken(
  vaultAddress: string,
  token: string,
  ttlSeconds: number,
  namespace?: string,
  options: TokenCacheOptions = {},
): Promise<void> {
  const { cacheDir = DEFAULT_CACHE_DIR } = options;
  const cachePath = getCachePath(vaultAddress, namespace, cacheDir);

  const now = Date.now();
  const cached: CachedToken = {
    token,
    expiresAt: now + ttlSeconds * 1000,
    createdAt: now,
    namespace,
    vaultAddress,
  };

  // Ensure cache directory exists
  await mkdir(cacheDir, { recursive: true, mode: 0o700 });

  // Write the cache file with restricted permissions
  await writeFile(cachePath, JSON.stringify(cached, null, 2), {
    mode: 0o600,
    encoding: 'utf8',
  });

  // Ensure permissions are correct (writeFile mode may not work on all platforms)
  await chmod(cachePath, 0o600);
}

/**
 * Clear a cached token.
 *
 * @param vaultAddress - The Vault server address
 * @param namespace - Optional Vault namespace
 * @param options - Cache options
 */
export async function clearCachedToken(
  vaultAddress: string,
  namespace?: string,
  options: TokenCacheOptions = {},
): Promise<void> {
  const { cacheDir } = options;
  const cachePath = getCachePath(vaultAddress, namespace, cacheDir);

  try {
    await rm(cachePath);
  } catch {
    // Ignore errors if file doesn't exist
  }
}

/**
 * Check if a cached token exists and is valid (without returning the token).
 *
 * @param vaultAddress - The Vault server address
 * @param namespace - Optional Vault namespace
 * @param options - Cache options
 * @returns True if a valid cached token exists
 */
export async function hasCachedToken(
  vaultAddress: string,
  namespace?: string,
  options: TokenCacheOptions = {},
): Promise<boolean> {
  const cached = await getCachedToken(vaultAddress, namespace, options);
  return cached !== null;
}
