import { mkdir, mkdtemp, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { BuildImageOperation } from '@/docker';
import { Component, Monorepo, ResourceInfo } from '@/monorepo';
import { OpInput } from '@/operations/index.js';

import {
  ResourceBuildContext,
  ResourceFactory,
} from '../../../../src/monorepo/resources/ResourceFactory.js';
// Import to register the resource type
import '../../../../src/docker/resources/DockerImageResource.js';

/**
 * Configuration type for docker/image resource params.
 * Matches the type defined in DockerImageResource.ts
 */
type DockerImageResourceConfig = Partial<OpInput<BuildImageOperation>> & {
  image?: string;
  tag?: string;
};

const initGit = async (cwd: string) => {
  const { execa } = await import('execa');
  await execa('git', ['init'], { cwd });
  await execa('git', ['config', 'user.email', 'test@test.com'], { cwd });
  await execa('git', ['config', 'user.name', 'Test'], { cwd });
};

const commitFile = async (cwd: string, name: string, content = 'x') => {
  const { execa } = await import('execa');
  await writeFile(join(cwd, name), content);
  await execa('git', ['add', name], { cwd });
  await execa('git', ['commit', '-m', `add ${name}`], { cwd });
};

const waitForNewerMtime = async () => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 10);
  });
};

const mockSentinelAt = (
  store: { stat: ReturnType<typeof vi.fn>; readFile: ReturnType<typeof vi.fn> },
  mtime: Date,
) => {
  store.stat.mockResolvedValue({ mtime });
  store.readFile.mockResolvedValue(JSON.stringify({ mtime: mtime.getTime() }));
};

describe('Docker / DockerImageResource', () => {
  let rootDir: string;
  let componentDir: string;
  let mockMonorepo: Monorepo;
  let mockComponent: Component;
  let mockStore: {
    stat: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'embDockerImage'));
    componentDir = join(rootDir, 'mycomponent');
    await mkdir(componentDir, { recursive: true });

    // Create a Dockerfile
    await writeFile(join(componentDir, 'Dockerfile'), 'FROM node:18\n');

    mockStore = {
      stat: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };

    mockMonorepo = {
      name: 'test-project',
      rootDir,
      currentFlavor: 'default',
      store: mockStore,
      join: vi.fn((path: string) => join(rootDir, path)),
      expand: vi.fn((value: unknown) => Promise.resolve(value)),
      defaults: {
        docker: {
          tag: 'latest',
          buildArgs: {},
        },
      },
      flavors: {},
      flavor(name: string) {
        return (this as unknown as Monorepo).flavors[name];
      },
    } as unknown as Monorepo;

    mockComponent = {
      name: 'mycomponent',
      rootDir: 'mycomponent',
      join: vi.fn((path: string) => join(componentDir, path)),
      relative: vi.fn((path: string) => join('mycomponent', path)),
    } as unknown as Component;
  });

  afterEach(async () => {
    await rimraf(rootDir);
  });

  const createBuilder = (
    params: DockerImageResourceConfig = {},
    extra: Partial<ResourceInfo<DockerImageResourceConfig>> = {},
  ) => {
    const config: ResourceInfo<DockerImageResourceConfig> = {
      id: 'mycomponent:docker-image',
      name: 'docker-image',
      component: 'mycomponent',
      type: 'docker/image',
      params,
      ...extra,
    };

    const context: ResourceBuildContext<DockerImageResourceConfig> = {
      config,
      component: mockComponent,
      monorepo: mockMonorepo,
    };

    return ResourceFactory.factor('docker/image', context);
  };

  describe('ResourceFactory registration', () => {
    test('it registers docker/image resource type', () => {
      const builder = createBuilder();

      expect(builder).toBeDefined();
    });
  });

  describe('#getReference()', () => {
    test('it returns image name with project and component', async () => {
      const builder = createBuilder();

      const reference = await builder.getReference();

      expect(reference).toBe('test-project/mycomponent:latest');
    });

    test('it uses explicit image parameter', async () => {
      const builder = createBuilder({ image: 'api-backend' });

      const reference = await builder.getReference();

      expect(reference).toBe('test-project/api-backend:latest');
    });

    test('it uses explicit tag parameter', async () => {
      const builder = createBuilder({ tag: 'v1.0.0' });

      const reference = await builder.getReference();

      expect(reference).toBe('test-project/mycomponent:v1.0.0');
    });

    test('it uses both explicit image and tag parameters', async () => {
      const builder = createBuilder({
        image: 'api-worker',
        tag: 'v2.0.0',
      });

      const reference = await builder.getReference();

      expect(reference).toBe('test-project/api-worker:v2.0.0');
    });

    test('it uses monorepo default tag when no tag in config', async () => {
      (mockMonorepo.defaults.docker as { tag: string }).tag = 'dev';
      const builder = createBuilder();

      const reference = await builder.getReference();

      expect(reference).toBe('test-project/mycomponent:dev');
    });

    test('it uses explicit tag over monorepo default', async () => {
      (mockMonorepo.defaults.docker as { tag: string }).tag = 'dev';
      const builder = createBuilder({ tag: 'production' });

      const reference = await builder.getReference();

      expect(reference).toBe('test-project/mycomponent:production');
    });
  });

  describe('#build()', () => {
    test('it returns BuildImageOperation with correct context', async () => {
      // Create a source file
      await writeFile(join(componentDir, 'index.ts'), 'console.log("hello")');

      const builder = createBuilder();
      const resource: ResourceInfo<DockerImageResourceConfig> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: {},
      };

      const result = await builder.build(resource);

      expect(result.input.context).toBe(componentDir);
      expect(result.input.dockerfile).toBe('Dockerfile');
      expect(result.operation).toBeInstanceOf(BuildImageOperation);
    });

    test('it uses component-relative context when provided', async () => {
      await mkdir(join(componentDir, 'docker'), { recursive: true });
      await writeFile(
        join(componentDir, 'docker', 'Dockerfile'),
        'FROM alpine\n',
      );

      const builder = createBuilder({ context: 'docker' });
      const resource: ResourceInfo<DockerImageResourceConfig> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: { context: 'docker' },
      };

      const result = await builder.build(resource);

      expect(result.input.context).toBe(join(componentDir, 'docker'));
    });

    test('it uses absolute context when path starts with /', async () => {
      const absContext = join(rootDir, 'shared-docker');
      await mkdir(absContext, { recursive: true });
      await writeFile(join(absContext, 'Dockerfile'), 'FROM ubuntu\n');

      const builder = createBuilder({ context: '/shared-docker' });
      const resource: ResourceInfo<DockerImageResourceConfig> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: { context: '/shared-docker' },
      };

      const result = await builder.build(resource);

      expect(result.input.context).toBe(absContext);
    });

    test('it sets labels including emb metadata', async () => {
      const builder = createBuilder();
      const resource: ResourceInfo<DockerImageResourceConfig> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: {},
      };

      const result = await builder.build(resource);

      expect(result.input.labels).toEqual({
        'emb/project': 'test-project',
        'emb/component': 'mycomponent',
        'emb/flavor': 'default',
      });
    });

    test('it merges custom labels with emb labels', async () => {
      const builder = createBuilder({
        labels: { version: '1.0.0', maintainer: 'dev@example.com' },
      });
      const resource: ResourceInfo<DockerImageResourceConfig> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: {
          labels: { version: '1.0.0', maintainer: 'dev@example.com' },
        },
      };

      const result = await builder.build(resource);

      expect(result.input.labels).toEqual({
        version: '1.0.0',
        maintainer: 'dev@example.com',
        'emb/project': 'test-project',
        'emb/component': 'mycomponent',
        'emb/flavor': 'default',
      });
    });

    test('it uses custom dockerfile when provided', async () => {
      await writeFile(
        join(componentDir, 'Dockerfile.prod'),
        'FROM node:18-alpine\n',
      );

      const builder = createBuilder({
        dockerfile: 'Dockerfile.prod',
      });
      const resource: ResourceInfo<DockerImageResourceConfig> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: {
          dockerfile: 'Dockerfile.prod',
        },
      };

      const result = await builder.build(resource);

      expect(result.input.dockerfile).toBe('Dockerfile.prod');
    });

    test('it passes build args from config', async () => {
      const builder = createBuilder({
        buildArgs: { NODE_ENV: 'production' },
      });
      const resource: ResourceInfo<DockerImageResourceConfig> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: {
          buildArgs: { NODE_ENV: 'production' },
        },
      };

      const result = await builder.build(resource);

      expect(result.input.buildArgs).toEqual({ NODE_ENV: 'production' });
    });

    test('it excludes files matched by .dockerignore from src', async () => {
      await writeFile(join(componentDir, 'index.ts'), 'console.log("hello")');
      await writeFile(join(componentDir, 'secrets.env'), 'TOKEN=shh');
      await mkdir(join(componentDir, 'node_modules', 'dep'), {
        recursive: true,
      });
      await writeFile(
        join(componentDir, 'node_modules', 'dep', 'index.js'),
        '',
      );
      await writeFile(
        join(componentDir, '.dockerignore'),
        ['node_modules', '*.env'].join('\n'),
      );

      const builder = createBuilder();
      const resource: ResourceInfo<DockerImageResourceConfig> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: {},
      };

      const result = await builder.build(resource);

      const src = result.input.src ?? [];
      expect(src).toContain('Dockerfile');
      expect(src).toContain('index.ts');
      expect(src).not.toContain('secrets.env');
      expect(src.some((p) => p.includes('node_modules'))).toBe(false);
    });

    test('it keeps all files when no .dockerignore is present', async () => {
      await writeFile(join(componentDir, 'index.ts'), 'console.log("hello")');
      await writeFile(join(componentDir, 'secrets.env'), 'TOKEN=shh');

      const builder = createBuilder();
      const resource: ResourceInfo<DockerImageResourceConfig> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: {},
      };

      const result = await builder.build(resource);

      const src = result.input.src ?? [];
      expect(src).toContain('Dockerfile');
      expect(src).toContain('index.ts');
      expect(src).toContain('secrets.env');
    });

    test('it passes target stage when provided', async () => {
      const builder = createBuilder({ target: 'runtime' });
      const resource: ResourceInfo<DockerImageResourceConfig> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: { target: 'runtime' },
      };

      const result = await builder.build(resource);

      expect(result.input.target).toBe('runtime');
    });
  });

  describe('#mustBuild() — git-scan baseline (no sentinel)', () => {
    const resource: ResourceInfo<DockerImageResourceConfig> = {
      id: 'mycomponent:docker-image',
      name: 'docker-image',
      component: 'mycomponent',
      type: 'docker/image',
      params: {},
    };

    test('it returns the newest mtime across git-tracked files under the docker context', async () => {
      await initGit(componentDir);
      await commitFile(componentDir, 'Dockerfile', 'FROM node:18\n');

      const builder = createBuilder();
      const result = await builder.mustBuild?.(resource);

      const dfStats = await stat(join(componentDir, 'Dockerfile'));
      expect(result).toMatchObject({
        mtime: dfStats.mtime.getTime(),
        strategy: 'auto',
        source: 'builtin',
      });
    });

    test('it returns the max mtime when several tracked files are present', async () => {
      await initGit(componentDir);
      await commitFile(componentDir, 'Dockerfile', 'FROM node:18\n');
      // Ensure the second file gets a strictly newer mtime.
      await waitForNewerMtime();
      await commitFile(componentDir, 'package.json', '{}');

      const builder = createBuilder();
      const result = await builder.mustBuild?.(resource);

      const dfStats = await stat(join(componentDir, 'Dockerfile'));
      const pkgStats = await stat(join(componentDir, 'package.json'));
      const expected = Math.max(
        dfStats.mtime.getTime(),
        pkgStats.mtime.getTime(),
      );
      expect(result).toMatchObject({
        mtime: expected,
        strategy: 'auto',
        source: 'builtin',
      });
    });

    test('it considers only git-tracked files, ignoring untracked ones', async () => {
      await initGit(componentDir);
      await commitFile(componentDir, 'Dockerfile', 'FROM node:18\n');
      // Untracked file with a (probably) newer mtime must NOT influence result.
      await waitForNewerMtime();
      await writeFile(join(componentDir, 'scratch.txt'), 'untracked');

      const builder = createBuilder();
      const result = await builder.mustBuild?.(resource);

      const dfStats = await stat(join(componentDir, 'Dockerfile'));
      expect(result).toMatchObject({
        mtime: dfStats.mtime.getTime(),
        strategy: 'auto',
        source: 'builtin',
      });
    });

    test('it returns undefined when there are no git-tracked files', async () => {
      await initGit(componentDir);
      // No files committed.

      const builder = createBuilder();
      const result = await builder.mustBuild?.(resource);

      expect(result).toBeUndefined();
    });
  });

  describe('#mustBuild() — strategy dispatch', () => {
    const resource: ResourceInfo<DockerImageResourceConfig> = {
      id: 'mycomponent:docker-image',
      name: 'docker-image',
      component: 'mycomponent',
      type: 'docker/image',
      params: {},
    };

    test('always strategy rebuilds regardless of the previous sentinel', async () => {
      const past = new Date(Date.now() - 60_000);
      mockSentinelAt(mockStore, past);

      const builder = createBuilder(
        {},
        { rebuildTrigger: { strategy: 'always' } },
      );
      const result = await builder.mustBuild?.({
        ...resource,
        rebuildTrigger: { strategy: 'always' },
      });

      expect(result).toMatchObject({
        strategy: 'always',
        source: 'resource',
      });
      const sentinel = result as undefined | { mtime: number };
      expect(sentinel?.mtime).toBeGreaterThan(past.getTime());
    });

    test('watch-paths skips when a watched file has not changed since the sentinel', async () => {
      await initGit(componentDir);
      await commitFile(componentDir, 'Dockerfile', 'FROM node:18\n');
      const dfStats = await stat(join(componentDir, 'Dockerfile'));
      // Sentinel is one minute AFTER the file's mtime → cache hit, no rebuild.
      mockSentinelAt(mockStore, new Date(dfStats.mtime.getTime() + 60_000));

      const res: ResourceInfo<DockerImageResourceConfig> = {
        ...resource,
        rebuildTrigger: { strategy: 'watch-paths', paths: ['Dockerfile'] },
      };
      const builder = createBuilder({}, { rebuildTrigger: res.rebuildTrigger });

      const result = await builder.mustBuild?.(res);

      expect(result).toBeUndefined();
    });

    test('watch-paths rebuilds when a watched file is newer than the sentinel', async () => {
      await initGit(componentDir);
      await commitFile(componentDir, 'Dockerfile', 'FROM node:18\n');
      const dfStats = await stat(join(componentDir, 'Dockerfile'));
      // Sentinel is one minute BEFORE the file's mtime → rebuild.
      mockSentinelAt(mockStore, new Date(dfStats.mtime.getTime() - 60_000));

      const res: ResourceInfo<DockerImageResourceConfig> = {
        ...resource,
        rebuildTrigger: { strategy: 'watch-paths', paths: ['Dockerfile'] },
      };
      const builder = createBuilder({}, { rebuildTrigger: res.rebuildTrigger });

      const result = await builder.mustBuild?.(res);

      expect(result).toMatchObject({
        mtime: dfStats.mtime.getTime(),
        strategy: 'watch-paths',
        source: 'resource',
      });
    });

    test('watch-paths ignores untracked changes outside the watched list', async () => {
      await initGit(componentDir);
      await commitFile(componentDir, 'Dockerfile', 'FROM node:18\n');
      const dfStats = await stat(join(componentDir, 'Dockerfile'));
      // Sentinel is AFTER Dockerfile → should be a cache hit for Dockerfile-only watch.
      mockSentinelAt(mockStore, new Date(dfStats.mtime.getTime() + 60_000));

      // Add a newer unrelated file AFTER the sentinel — must not trigger rebuild.
      await waitForNewerMtime();
      await writeFile(join(componentDir, 'src.ts'), 'console.log(1)');

      const res: ResourceInfo<DockerImageResourceConfig> = {
        ...resource,
        rebuildTrigger: { strategy: 'watch-paths', paths: ['Dockerfile'] },
      };
      const builder = createBuilder({}, { rebuildTrigger: res.rebuildTrigger });

      const result = await builder.mustBuild?.(res);

      expect(result).toBeUndefined();
    });

    test('watch-paths follows a /-prefixed path to the monorepo root', async () => {
      await writeFile(join(rootDir, 'pnpm-lock.yaml'), 'lock');
      const lockStats = await stat(join(rootDir, 'pnpm-lock.yaml'));
      mockSentinelAt(mockStore, new Date(lockStats.mtime.getTime() - 60_000));

      const res: ResourceInfo<DockerImageResourceConfig> = {
        ...resource,
        rebuildTrigger: {
          strategy: 'watch-paths',
          paths: ['/pnpm-lock.yaml'],
        },
      };
      const builder = createBuilder({}, { rebuildTrigger: res.rebuildTrigger });

      const result = await builder.mustBuild?.(res);

      expect(result).toMatchObject({
        mtime: lockStats.mtime.getTime(),
        strategy: 'watch-paths',
        source: 'resource',
      });
    });

    test('flavor-level default is applied when the resource has no trigger', async () => {
      await writeFile(join(componentDir, 'Dockerfile'), 'FROM node:18\n');
      const dfStats = await stat(join(componentDir, 'Dockerfile'));
      mockSentinelAt(mockStore, new Date(dfStats.mtime.getTime() - 60_000));

      (
        mockMonorepo as unknown as { flavors: Record<string, unknown> }
      ).flavors = {
        default: {
          defaults: {
            rebuildPolicy: {
              'docker/image': {
                strategy: 'watch-paths',
                paths: ['Dockerfile'],
              },
            },
          },
        },
      };

      const builder = createBuilder();
      const result = await builder.mustBuild?.(resource);

      expect(result).toMatchObject({
        mtime: dfStats.mtime.getTime(),
        strategy: 'watch-paths',
        source: 'flavor',
      });
    });

    test('resource trigger wins over the flavor-level default', async () => {
      const past = new Date(Date.now() - 60_000);
      mockSentinelAt(mockStore, past);

      (
        mockMonorepo as unknown as { flavors: Record<string, unknown> }
      ).flavors = {
        default: {
          defaults: {
            rebuildPolicy: {
              'docker/image': { strategy: 'auto' },
            },
          },
        },
      };

      const res: ResourceInfo<DockerImageResourceConfig> = {
        ...resource,
        rebuildTrigger: { strategy: 'always' },
      };
      const builder = createBuilder({}, { rebuildTrigger: res.rebuildTrigger });

      const result = await builder.mustBuild?.(res);

      expect(result).toMatchObject({
        strategy: 'always',
        source: 'resource',
      });
    });
  });
});
