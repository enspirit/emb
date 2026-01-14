import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
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
    params: Partial<OpInput<BuildImageOperation>> = {},
  ) => {
    const config: ResourceInfo<OpInput<BuildImageOperation>> = {
      id: 'mycomponent:docker-image',
      name: 'docker-image',
      component: 'mycomponent',
      type: 'docker/image',
      params: params as OpInput<BuildImageOperation>,
    };

    const context: ResourceBuildContext<OpInput<BuildImageOperation>> = {
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

    test('it uses custom image name and tag when provided in config', async () => {
      const builder = createBuilder({ tag: 'myimage:v1.0.0' } as Partial<
        OpInput<BuildImageOperation>
      >);

      const reference = await builder.getReference();

      expect(reference).toBe('test-project/myimage:v1.0.0');
    });

    test('it uses custom image name with default tag when no tag suffix', async () => {
      const builder = createBuilder({ tag: 'myimage' } as Partial<
        OpInput<BuildImageOperation>
      >);

      const reference = await builder.getReference();

      expect(reference).toBe('test-project/myimage:latest');
    });

    test('it uses monorepo default tag when no tag in config', async () => {
      (mockMonorepo.defaults.docker as { tag: string }).tag = 'dev';
      const builder = createBuilder();

      const reference = await builder.getReference();

      expect(reference).toBe('test-project/mycomponent:dev');
    });
  });

  describe('#build()', () => {
    test('it returns BuildImageOperation with correct context', async () => {
      // Create a source file
      await writeFile(join(componentDir, 'index.ts'), 'console.log("hello")');

      const builder = createBuilder();
      const resource: ResourceInfo<OpInput<BuildImageOperation>> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: {} as OpInput<BuildImageOperation>,
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

      const builder = createBuilder({ context: 'docker' } as Partial<
        OpInput<BuildImageOperation>
      >);
      const resource: ResourceInfo<OpInput<BuildImageOperation>> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: { context: 'docker' } as OpInput<BuildImageOperation>,
      };

      const result = await builder.build(resource);

      expect(result.input.context).toBe(join(componentDir, 'docker'));
    });

    test('it uses absolute context when path starts with /', async () => {
      const absContext = join(rootDir, 'shared-docker');
      await mkdir(absContext, { recursive: true });
      await writeFile(join(absContext, 'Dockerfile'), 'FROM ubuntu\n');

      const builder = createBuilder({ context: '/shared-docker' } as Partial<
        OpInput<BuildImageOperation>
      >);
      const resource: ResourceInfo<OpInput<BuildImageOperation>> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: { context: '/shared-docker' } as OpInput<BuildImageOperation>,
      };

      const result = await builder.build(resource);

      expect(result.input.context).toBe(absContext);
    });

    test('it sets labels including emb metadata', async () => {
      const builder = createBuilder();
      const resource: ResourceInfo<OpInput<BuildImageOperation>> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: {} as OpInput<BuildImageOperation>,
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
      } as Partial<OpInput<BuildImageOperation>>);
      const resource: ResourceInfo<OpInput<BuildImageOperation>> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: {
          labels: { version: '1.0.0', maintainer: 'dev@example.com' },
        } as unknown as OpInput<BuildImageOperation>,
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
      } as Partial<OpInput<BuildImageOperation>>);
      const resource: ResourceInfo<OpInput<BuildImageOperation>> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: {
          dockerfile: 'Dockerfile.prod',
        } as OpInput<BuildImageOperation>,
      };

      const result = await builder.build(resource);

      expect(result.input.dockerfile).toBe('Dockerfile.prod');
    });

    test('it passes build args from config', async () => {
      const builder = createBuilder({
        buildArgs: { NODE_ENV: 'production' },
      } as Partial<OpInput<BuildImageOperation>>);
      const resource: ResourceInfo<OpInput<BuildImageOperation>> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: {
          buildArgs: { NODE_ENV: 'production' },
        } as unknown as OpInput<BuildImageOperation>,
      };

      const result = await builder.build(resource);

      expect(result.input.buildArgs).toEqual({ NODE_ENV: 'production' });
    });

    test('it passes target stage when provided', async () => {
      const builder = createBuilder({ target: 'runtime' } as Partial<
        OpInput<BuildImageOperation>
      >);
      const resource: ResourceInfo<OpInput<BuildImageOperation>> = {
        id: 'mycomponent:docker-image',
        name: 'docker-image',
        component: 'mycomponent',
        type: 'docker/image',
        params: { target: 'runtime' } as OpInput<BuildImageOperation>,
      };

      const result = await builder.build(resource);

      expect(result.input.target).toBe('runtime');
    });
  });
});
