import {
  createCipheriv,
  createDecipheriv,
  createHash,
  pbkdf2Sync,
  randomBytes,
} from 'node:crypto';
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, hostname, userInfo } from 'node:os';
import { join } from 'node:path';

/**
 * Cached token metadata stored on disk.
 */
export interface CachedToken {
  /** Unix timestamp (ms) when the token was cached */
  createdAt: number;
  /** Unix timestamp (ms) when the token expires */
  expiresAt: number;
  /** Vault namespace (if any) */
  namespace?: string;
  /** The Vault client token */
  token: string;
  /** Vault address this token is for */
  vaultAddress: string;
}

/**
 * Options for token caching.
 */
export interface TokenCacheOptions {
  /** Custom cache directory (default: ~/.emb/vault-tokens) */
  cacheDir?: string;
  /** Buffer time in ms before expiry to consider token invalid (default: 5 minutes) */
  expiryBuffer?: number;
}

const DEFAULT_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CACHE_DIR = join(homedir(), '.emb', 'vault-tokens');

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const _AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;

/**
 * Encrypted cache file format stored on disk.
 */
interface EncryptedCacheFile {
  /** Authentication tag (hex) */
  authTag: string;
  /** Encrypted data (hex) */
  encrypted: string;
  /** Initialization vector (hex) */
  iv: string;
  /** Salt used for key derivation (hex) */
  salt: string;
  /** Version of the encryption format */
  version: 1;
}

/**
 * Derive an encryption key from machine-specific data.
 * The key is derived from hostname + username + a static pepper,
 * making the cache file unusable if copied to another machine or user.
 */
function deriveKey(salt: Buffer): Buffer {
  const machineId = `${hostname()}:${userInfo().username}:emb-vault-cache`;
  return pbkdf2Sync(machineId, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt data using AES-256-GCM.
 */
function encrypt(data: string): EncryptedCacheFile {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(data, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    version: 1,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encrypted: encrypted.toString('hex'),
  };
}

/**
 * Decrypt data using AES-256-GCM.
 * Returns null if decryption fails (wrong machine, corrupted data, etc.)
 */
function decrypt(file: EncryptedCacheFile): null | string {
  try {
    if (file.version !== 1) {
      return null;
    }

    const salt = Buffer.from(file.salt, 'hex');
    const key = deriveKey(salt);
    const iv = Buffer.from(file.iv, 'hex');
    const authTag = Buffer.from(file.authTag, 'hex');
    const encrypted = Buffer.from(file.encrypted, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    // Decryption failed - wrong key (different machine/user) or corrupted data
    return null;
  }
}

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
    const encryptedFile = JSON.parse(content) as EncryptedCacheFile;

    // Decrypt the cached data
    const decrypted = decrypt(encryptedFile);
    if (!decrypted) {
      // Decryption failed - likely different machine/user or corrupted
      await clearCachedToken(vaultAddress, namespace, options);
      return null;
    }

    const cached = JSON.parse(decrypted) as CachedToken;

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
 * Cache a Vault token to disk (encrypted).
 *
 * @param vaultAddress - The Vault server address
 * @param token - The Vault client token
 * @param ttlSeconds - Token TTL in seconds (from Vault's lease_duration)
 * @param namespace - Optional Vault namespace
 * @param options - Cache options
 */
// eslint-disable-next-line max-params
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

  // Encrypt the token data
  const encryptedFile = encrypt(JSON.stringify(cached));

  // Ensure cache directory exists
  await mkdir(cacheDir, { recursive: true, mode: 0o700 });

  // Write the encrypted cache file with restricted permissions
  await writeFile(cachePath, JSON.stringify(encryptedFile, null, 2), {
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
