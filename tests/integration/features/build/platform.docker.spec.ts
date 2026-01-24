/**
 * Integration tests for Docker image platform/architecture support.
 *
 * Uses the production-ready example which has platform configuration
 * in the production flavor. Tests dynamically detect the host architecture
 * and use a foreign platform for cross-platform build tests.
 */
import { runCommand } from '@oclif/test';
import { execa } from 'execa';
import { arch } from 'node:os';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { useExampleWithDocker } from '../../helpers.js';

/**
 * Map Node.js arch to Docker platform architecture names.
 */
function getDockerArch(nodeArch: string): string {
  const archMap: Record<string, string> = {
    arm: 'arm',
    arm64: 'arm64',
    x64: 'amd64',
  };
  return archMap[nodeArch] ?? 'amd64';
}

/**
 * Get the native and foreign architectures for the current host.
 * Foreign architecture is used to test cross-platform builds.
 */
function getPlatformConfig(): { native: string; foreign: string } {
  const nativeArch = getDockerArch(arch());

  // Choose a foreign architecture that's different from native
  const foreignArch = nativeArch === 'amd64' ? 'arm64' : 'amd64';

  return {
    native: nativeArch,
    foreign: foreignArch,
  };
}

/**
 * Get the platform (OS/architecture) of a Docker image.
 */
async function getImagePlatform(
  imageName: string,
): Promise<null | { os: string; architecture: string }> {
  try {
    const { stdout } = await execa('docker', [
      'inspect',
      imageName,
      '--format',
      '{{.Os}}/{{.Architecture}}',
    ]);
    const [os, architecture] = stdout.trim().split('/');
    return { os, architecture };
  } catch {
    return null;
  }
}

/**
 * Check if a Docker image exists with the EMB project label.
 */
async function imageExists(
  projectName: string,
  componentName: string,
): Promise<boolean> {
  const { stdout } = await execa('docker', [
    'images',
    '--filter',
    `label=emb/project=${projectName}`,
    '--format',
    '{{.Repository}}:{{.Tag}}',
  ]);
  return stdout.includes(`${projectName}/${componentName}`);
}

describe('Build - platform support', () => {
  useExampleWithDocker('production-ready');

  const { native, foreign } = getPlatformConfig();
  let previousDockerPlatform: string | undefined;

  // Set the foreign platform via env var for production flavor tests
  beforeAll(() => {
    previousDockerPlatform = process.env.DOCKER_PLATFORM;
    process.env.DOCKER_PLATFORM = `linux/${foreign}`;
  });

  afterAll(() => {
    if (previousDockerPlatform === undefined) {
      delete process.env.DOCKER_PLATFORM;
    } else {
      process.env.DOCKER_PLATFORM = previousDockerPlatform;
    }
  });

  test('builds image with default platform (native architecture)', async () => {
    // Build without flavor - should use host's native platform
    const { error } = await runCommand('resources build api:image --force');

    expect(error).toBeUndefined();
    expect(await imageExists('production-ready', 'api')).toBe(true);

    const platform = await getImagePlatform('production-ready/api:latest');
    expect(platform).not.toBeNull();
    expect(platform?.os).toBe('linux');
    expect(platform?.architecture).toBe(native);
  });

  test('builds image with foreign platform from production flavor', async () => {
    // Build with production flavor - should use foreign platform
    const { error } = await runCommand(
      'resources build api:image --flavor production --force',
    );

    expect(error).toBeUndefined();
    expect(await imageExists('production-ready', 'api')).toBe(true);

    const platform = await getImagePlatform('production-ready/api:latest');
    expect(platform).not.toBeNull();
    expect(platform?.os).toBe('linux');
    expect(platform?.architecture).toBe(foreign);
  });

  test('builds multiple images with foreign platform from flavor', async () => {
    const { error } = await runCommand(
      'resources build --flavor production --force',
    );

    expect(error).toBeUndefined();

    // Both api and web should be built with foreign platform
    // Check api image
    expect(await imageExists('production-ready', 'api')).toBe(true);
    const apiPlatform = await getImagePlatform('production-ready/api:latest');
    expect(apiPlatform).not.toBeNull();
    expect(apiPlatform?.os).toBe('linux');
    expect(apiPlatform?.architecture).toBe(foreign);

    // Check web image
    expect(await imageExists('production-ready', 'web')).toBe(true);
    const webPlatform = await getImagePlatform('production-ready/web:latest');
    expect(webPlatform).not.toBeNull();
    expect(webPlatform?.os).toBe('linux');
    expect(webPlatform?.architecture).toBe(foreign);
  });
});
