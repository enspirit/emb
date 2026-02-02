import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface DockerAuthConfig {
  password: string;
  serveraddress?: string;
  username: string;
}

interface DockerConfig {
  auths?: Record<string, { auth?: string }>;
  credHelpers?: Record<string, string>;
  credsStore?: string;
}

interface CredentialHelperResponse {
  Secret: string;
  ServerURL?: string;
  Username: string;
}

/**
 * Extract registry hostname from an image reference.
 * e.g., "registry.example.com/foo/bar:tag" -> "registry.example.com"
 * e.g., "foo/bar:tag" -> "https://index.docker.io/v1/" (Docker Hub)
 */
function getRegistryFromImage(imageRef: string): string {
  // Remove tag if present
  const withoutTag = imageRef.split(':')[0];
  const parts = withoutTag.split('/');

  // If first part contains a dot or colon, it's a registry
  if (parts.length > 1 && (parts[0].includes('.') || parts[0].includes(':'))) {
    return parts[0];
  }

  // Default to Docker Hub
  return 'https://index.docker.io/v1/';
}

/**
 * Read Docker config file from ~/.docker/config.json
 */
async function readDockerConfig(): Promise<DockerConfig | null> {
  try {
    const configPath = join(homedir(), '.docker', 'config.json');
    const content = await readFile(configPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Get credentials from a credential helper binary.
 * Credential helpers are named docker-credential-<helper>.
 */
async function getCredentialsFromHelper(
  helper: string,
  registry: string,
): Promise<DockerAuthConfig | null> {
  return new Promise((resolve) => {
    const helperName = `docker-credential-${helper}`;
    const proc = spawn(helperName, ['get']);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', () => {
      resolve(null);
    });

    proc.on('close', (code) => {
      if (code !== 0 || stderr) {
        resolve(null);
        return;
      }

      try {
        const response: CredentialHelperResponse = JSON.parse(stdout);

        if (response.Username && response.Secret) {
          resolve({
            username: response.Username,
            password: response.Secret,
            serveraddress: response.ServerURL || registry,
          });
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    });

    proc.stdin.write(registry);
    proc.stdin.end();
  });
}

/**
 * Get credentials from the auths section of Docker config (base64 encoded).
 */
function getCredentialsFromAuths(
  auths: Record<string, { auth?: string }>,
  registry: string,
): DockerAuthConfig | null {
  // Try exact match first
  let authEntry = auths[registry];

  // Try with https:// prefix
  if (!authEntry && !registry.startsWith('http')) {
    authEntry = auths[`https://${registry}`];
  }

  // Try without https:// prefix
  if (!authEntry && registry.startsWith('https://')) {
    authEntry = auths[registry.replace('https://', '')];
  }

  if (!authEntry?.auth) {
    return null;
  }

  try {
    const decoded = Buffer.from(authEntry.auth, 'base64').toString('utf8');
    const [username, password] = decoded.split(':');

    if (username && password) {
      return { username, password, serveraddress: registry };
    }
  } catch {
    // Invalid base64
  }

  return null;
}

/**
 * Get Docker authentication credentials for pushing an image.
 *
 * Resolution order:
 * 1. DOCKER_USERNAME and DOCKER_PASSWORD environment variables
 * 2. Credential helper from credHelpers (registry-specific)
 * 3. Default credential store from credsStore
 * 4. Base64-encoded credentials from auths
 * 5. Return undefined to let Docker use its defaults
 *
 * @param imageRef - The full image reference (e.g., "registry.example.com/foo/bar:tag")
 * @returns Authentication config or undefined if relying on Docker defaults
 */
export async function getDockerAuthConfig(
  imageRef: string,
): Promise<DockerAuthConfig | undefined> {
  // 1. Check environment variables first (explicit config takes priority)
  if (process.env.DOCKER_USERNAME && process.env.DOCKER_PASSWORD) {
    return {
      username: process.env.DOCKER_USERNAME,
      password: process.env.DOCKER_PASSWORD,
    };
  }

  const config = await readDockerConfig();
  if (!config) {
    return undefined;
  }

  const registry = getRegistryFromImage(imageRef);

  // 2. Check for registry-specific credential helper
  if (config.credHelpers?.[registry]) {
    const creds = await getCredentialsFromHelper(
      config.credHelpers[registry],
      registry,
    );
    if (creds) {
      return creds;
    }
  }

  // 3. Check for default credential store
  if (config.credsStore) {
    const creds = await getCredentialsFromHelper(config.credsStore, registry);
    if (creds) {
      return creds;
    }
  }

  // 4. Check for base64-encoded credentials in auths
  if (config.auths) {
    const creds = getCredentialsFromAuths(config.auths, registry);
    if (creds) {
      return creds;
    }
  }

  // 5. No credentials found - return undefined to let Docker handle it
  return undefined;
}
