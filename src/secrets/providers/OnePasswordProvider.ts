import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { AbstractSecretProvider, SecretReference } from '../SecretProvider.js';
import { OnePasswordError } from './OnePasswordError.js';

/**
 * Configuration for the 1Password provider.
 */
export interface OnePasswordProviderConfig {
  /** Account shorthand or UUID (optional) */
  account?: string;
}

/**
 * Response structure from `op item get --format json`
 */
interface OpItemResponse {
  fields?: Array<{
    id: string;
    label?: string;
    value?: string;
    type?: string;
    reference?: string;
  }>;
  id: string;
  title: string;
  vault: {
    id: string;
    name: string;
  };
}

/**
 * 1Password CLI secret provider.
 * Uses the `op` CLI to fetch secrets from 1Password vaults.
 *
 * Supports two authentication methods:
 * 1. Pre-authenticated session (interactive) - User runs `op signin` before using EMB
 * 2. Service account token (CI/CD) - Via `OP_SERVICE_ACCOUNT_TOKEN` env var
 */
export class OnePasswordProvider extends AbstractSecretProvider<OnePasswordProviderConfig> {
  private connected = false;

  /**
   * Execute the `op` CLI command.
   * Protected to allow mocking in tests.
   */
  protected async execOp(
    args: string[],
  ): Promise<{ stdout: string; stderr: string }> {
    const execFileAsync = promisify(execFile);
    return execFileAsync('op', args);
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      const args = ['whoami'];
      if (this.config.account) {
        args.push('--account', this.config.account);
      }

      await this.execOp(args);
      this.connected = true;
    } catch (error) {
      const err = error as NodeJS.ErrnoException & { stderr?: string };

      if (err.code === 'ENOENT') {
        throw new OnePasswordError(
          '1Password CLI (op) not found. Install from https://1password.com/downloads/command-line/',
          'OP_NOT_FOUND',
        );
      }

      // Check for authentication errors
      const stderr = err.stderr || err.message || '';
      if (
        stderr.includes('not signed in') ||
        stderr.includes('not currently signed in') ||
        stderr.includes('session expired') ||
        stderr.includes('authentication required') ||
        stderr.includes('You are not currently signed in')
      ) {
        throw new OnePasswordError(
          "Not signed in to 1Password. Run 'op signin' or set OP_SERVICE_ACCOUNT_TOKEN",
          'OP_NOT_AUTHENTICATED',
        );
      }

      throw new OnePasswordError(
        `Failed to connect to 1Password: ${stderr || err.message}`,
        'OP_CONNECTION_ERROR',
      );
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.clearCache();
  }

  async fetchSecret(ref: SecretReference): Promise<Record<string, unknown>> {
    // Ensure we're connected before fetching (lazy initialization)
    await this.connect();

    const segments = ref.path.split('/').filter(Boolean);

    if (segments.length !== 2) {
      throw new OnePasswordError(
        `Invalid secret path '${ref.path}'. Expected format: vault/item. ` +
          `For file attachments, use the 'op/file' resource type with an 'op://...' reference.`,
        'OP_INVALID_PATH',
      );
    }

    const [vault, item] = segments;

    try {
      const args = ['item', 'get', item, '--vault', vault, '--format', 'json'];
      if (this.config.account) {
        args.push('--account', this.config.account);
      }

      const { stdout } = await this.execOp(args);
      const response = JSON.parse(stdout) as OpItemResponse;

      // Convert fields to key-value pairs
      const result: Record<string, unknown> = {};
      if (response.fields) {
        for (const field of response.fields) {
          // Use label as key, fall back to id if no label
          const key = field.label || field.id;
          result[key] = field.value;
        }
      }

      return result;
    } catch (error) {
      // Re-throw OnePasswordError as-is (from path validation or other checks)
      if (error instanceof OnePasswordError) {
        throw error;
      }

      const err = error as NodeJS.ErrnoException & { stderr?: string };
      const stderr = err.stderr || err.message || '';

      // Check for specific error cases
      if (stderr.includes("isn't a vault")) {
        throw new OnePasswordError(
          `Vault '${vault}' not found in 1Password`,
          'OP_VAULT_NOT_FOUND',
        );
      }

      if (stderr.includes("isn't an item")) {
        throw new OnePasswordError(
          `Item '${item}' not found in vault '${vault}'`,
          'OP_ITEM_NOT_FOUND',
        );
      }

      if (
        stderr.includes('not signed in') ||
        stderr.includes('not currently signed in') ||
        stderr.includes('session expired')
      ) {
        throw new OnePasswordError(
          "Not signed in to 1Password. Run 'op signin' or set OP_SERVICE_ACCOUNT_TOKEN",
          'OP_NOT_AUTHENTICATED',
        );
      }

      throw new OnePasswordError(
        `Failed to fetch secret from 1Password: ${stderr}`,
        'OP_FETCH_ERROR',
      );
    }
  }

  /**
   * Fetch a 1Password file attachment and write its raw bytes to `destPath`.
   * Uses `op read --force --out-file` so the CLI writes the file directly,
   * bypassing stdout (which replaces non-UTF-8 bytes with U+FFFD and therefore
   * corrupts binary attachments like keystores and .p8 keys).
   *
   * @param reference A full 1Password secret reference, e.g. `op://vault/item/file`
   * @param destPath  Absolute path where the attachment should be written
   */
  async fetchFileAttachment(
    reference: string,
    destPath: string,
  ): Promise<void> {
    await this.connect();

    if (!reference.startsWith('op://')) {
      throw new OnePasswordError(
        `Invalid 1Password reference '${reference}'. Expected format: op://vault/item/file`,
        'OP_INVALID_REFERENCE',
      );
    }

    const args = ['read', '--force', '--out-file', destPath, reference];
    if (this.config.account) {
      args.push('--account', this.config.account);
    }

    try {
      await this.execOp(args);
    } catch (error) {
      const err = error as NodeJS.ErrnoException & { stderr?: string };
      const stderr = err.stderr || err.message || '';

      if (stderr.includes("isn't a vault")) {
        throw new OnePasswordError(
          `Vault in reference '${reference}' not found in 1Password`,
          'OP_VAULT_NOT_FOUND',
        );
      }

      if (stderr.includes("isn't an item")) {
        throw new OnePasswordError(
          `Item in reference '${reference}' not found`,
          'OP_ITEM_NOT_FOUND',
        );
      }

      if (
        stderr.includes('not signed in') ||
        stderr.includes('not currently signed in') ||
        stderr.includes('session expired')
      ) {
        throw new OnePasswordError(
          "Not signed in to 1Password. Run 'op signin' or set OP_SERVICE_ACCOUNT_TOKEN",
          'OP_NOT_AUTHENTICATED',
        );
      }

      throw new OnePasswordError(
        `Failed to read '${reference}': ${stderr}`,
        'OP_FILE_FETCH_ERROR',
      );
    }
  }
}
