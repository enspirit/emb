import { DockerComposeClient, EmbContext, SecretManager, setContext } from '@';
import Dockerode from 'dockerode';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompleteExample } from 'tests/fixtures/complete-example.js';
import { beforeEach, vi } from 'vitest';

import { EMBConfig } from '@/config';
import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo, MonorepoConfig } from '@/monorepo';

/**
 * Creates a test context with sensible defaults.
 * Override any property by passing it in the options.
 *
 * @example
 * // Use all defaults
 * const ctx = await createTestContext();
 *
 * @example
 * // Override kubernetes mock
 * const mockK8s = { core: { listNamespacedPod: vi.fn() } };
 * const ctx = await createTestContext({ kubernetes: mockK8s as never });
 *
 * @example
 * // Use a custom monorepo
 * const myRepo = new Monorepo({ project: { name: 'test' }, ... }, tempDir);
 * await myRepo.init();
 * const ctx = await createTestContext({ monorepo: myRepo });
 */
export async function createTestContext(
  overrides: Partial<EmbContext> = {},
): Promise<EmbContext> {
  // Use provided monorepo or create default
  const monorepo =
    overrides.monorepo ??
    (await (async () => {
      const config = new MonorepoConfig(CompleteExample);
      return new Monorepo(config, '/tmp/monorepo');
    })());

  // Use provided compose client or create one for the monorepo
  const compose = overrides.compose ?? new DockerComposeClient(monorepo);

  const ctx: EmbContext = {
    docker: overrides.docker ?? vi.mockObject(new Dockerode()),
    kubernetes: overrides.kubernetes ?? vi.mockObject(createKubernetesClient()),
    monorepo,
    compose,
    secrets: overrides.secrets ?? new SecretManager(),
  };

  setContext(ctx);
  return ctx;
}

/**
 * Result of createTestSetup - contains everything needed for a test.
 */
export interface TestSetup {
  /** Cleanup function (called automatically in afterEach) */
  cleanup: () => Promise<void>;
  /** The compose client */
  compose: DockerComposeClient;
  /** The test context (also set globally via setContext) */
  ctx: EmbContext;
  /** The monorepo instance */
  monorepo: Monorepo;
  /** The secrets manager */
  secrets: SecretManager;
  /** Temporary directory (automatically cleaned up in afterEach) */
  tempDir: string;
}

/**
 * Options for createTestSetup.
 */
export interface TestSetupOptions {
  /** Context overrides (e.g., custom kubernetes mock) */
  context?: Partial<Omit<EmbContext, 'compose' | 'monorepo' | 'secrets'>>;
  /** Custom embfile config (defaults to minimal config) */
  embfile?: EMBConfig;
  /** Prefix for temp directory name */
  tempDirPrefix?: string;
}

// Track temp directories for automatic cleanup
const tempDirs: string[] = [];

/**
 * Creates a complete test setup with temp directory, monorepo, and context.
 * The temp directory is automatically cleaned up after each test.
 *
 * @example
 * let setup: TestSetup;
 *
 * beforeEach(async () => {
 *   setup = await createTestSetup();
 *   vi.spyOn(setup.monorepo, 'run').mockResolvedValue(new Readable() as never);
 * });
 *
 * @example
 * // With custom kubernetes mock
 * const mockK8s = { core: { listNamespacedPod: vi.fn() } };
 * setup = await createTestSetup({
 *   context: { kubernetes: mockK8s as never }
 * });
 */
export async function createTestSetup(
  options: TestSetupOptions = {},
): Promise<TestSetup> {
  const {
    embfile = { project: { name: 'test' }, plugins: [], components: {} },
    context = {},
    tempDirPrefix = 'embTest',
  } = options;

  // Create temp directory
  const tempDir = await mkdtemp(join(tmpdir(), tempDirPrefix));
  await mkdir(join(tempDir, '.emb'), { recursive: true });
  tempDirs.push(tempDir);

  // Create monorepo
  const monorepo = new Monorepo(embfile, tempDir);
  await monorepo.init();

  // Create compose client
  const compose = new DockerComposeClient(monorepo);
  vi.spyOn(compose, 'isService').mockResolvedValue(false);

  // Create secrets manager
  const secrets = new SecretManager();

  // Create context
  const ctx: EmbContext = {
    docker: context.docker ?? vi.mockObject({} as never),
    kubernetes: context.kubernetes ?? vi.mockObject(createKubernetesClient()),
    monorepo,
    compose,
    secrets,
  };

  setContext(ctx);

  const cleanup = async () => {
    await rm(tempDir, { recursive: true, force: true });
  };

  return { ctx, monorepo, compose, secrets, tempDir, cleanup };
}

// Default beforeEach hook that sets up a standard context
// Tests that need custom contexts can call createTestContext() directly
// eslint-disable-next-line mocha/no-top-level-hooks
beforeEach(async () => {
  await createTestContext();
});
