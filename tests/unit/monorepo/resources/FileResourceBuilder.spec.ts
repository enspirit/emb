import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { Component, CreateFileOperation, ResourceInfo } from '@/monorepo';
import { OpInput } from '@/operations/index.js';

import { FileResourceBuilder } from '../../../../src/monorepo/resources/FileResourceBuilder.js';
import { ResourceBuildContext } from '../../../../src/monorepo/resources/ResourceFactory.js';

describe('Monorepo / Resources / FileResourceBuilder', () => {
  let mockComponent: Component;
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'embFileResource'));
    await mkdir(join(rootDir, 'mycomponent'), { recursive: true });

    mockComponent = {
      name: 'mycomponent',
      rootDir: 'mycomponent',
      join: vi.fn((path: string) => join(rootDir, 'mycomponent', path)),
      relative: vi.fn((path: string) => join('mycomponent', path)),
    } as unknown as Component;
  });

  const createBuilder = (
    params: OpInput<CreateFileOperation> = {},
    name = 'test-file.txt',
  ) => {
    const config: ResourceInfo<OpInput<CreateFileOperation>> = {
      id: 'mycomponent:test-file',
      name,
      component: 'mycomponent',
      type: 'file',
      params,
    };

    const context: ResourceBuildContext<OpInput<CreateFileOperation>> = {
      config,
      component: mockComponent,
      monorepo: {} as never,
    };

    return new FileResourceBuilder(context);
  };

  describe('#getReference()', () => {
    test('it returns relative path using config name when no path in params', async () => {
      const builder = createBuilder({}, 'output.txt');

      const reference = await builder.getReference();

      expect(mockComponent.relative).toHaveBeenCalledWith('output.txt');
      expect(reference).toBe(join('mycomponent', 'output.txt'));
    });

    test('it returns relative path using params.path when provided', async () => {
      const builder = createBuilder({ path: 'custom/path.txt' });

      const reference = await builder.getReference();

      expect(mockComponent.relative).toHaveBeenCalledWith('custom/path.txt');
      expect(reference).toBe(join('mycomponent', 'custom/path.txt'));
    });
  });

  describe('#getPath()', () => {
    test('it returns absolute path using config name when no path in params', async () => {
      const builder = createBuilder({}, 'output.txt');

      const path = await builder.getPath();

      expect(mockComponent.join).toHaveBeenCalledWith('output.txt');
      expect(path).toBe(join(rootDir, 'mycomponent', 'output.txt'));
    });

    test('it returns absolute path using params.path when provided', async () => {
      const builder = createBuilder({ path: 'custom/path.txt' });

      const path = await builder.getPath();

      expect(mockComponent.join).toHaveBeenCalledWith('custom/path.txt');
      expect(path).toBe(join(rootDir, 'mycomponent', 'custom/path.txt'));
    });
  });

  describe('#mustBuild()', () => {
    test('it returns true when file does not exist', async () => {
      const builder = createBuilder({}, 'nonexistent.txt');

      const result = await builder.mustBuild();

      expect(result).toBe(true);
    });

    test('it returns undefined when file exists', async () => {
      // Create the file first
      await writeFile(join(rootDir, 'mycomponent', 'existing.txt'), 'content');

      const builder = createBuilder({}, 'existing.txt');

      const result = await builder.mustBuild();

      expect(result).toBeUndefined();
    });
  });

  describe('#build()', () => {
    test('it returns CreateFileOperation with correct input', async () => {
      const builder = createBuilder({ script: 'echo hello' }, 'output.txt');

      const resource: ResourceInfo<OpInput<CreateFileOperation>> = {
        id: 'mycomponent:test-file',
        name: 'output.txt',
        component: 'mycomponent',
        type: 'file',
        params: { script: 'echo hello' },
      };

      const result = await builder.build(resource);

      expect(result.input).toEqual({
        path: join(rootDir, 'mycomponent', 'output.txt'),
        script: 'echo hello',
        cwd: join(rootDir, 'mycomponent', './'),
      });
      expect(result.operation).toBeInstanceOf(CreateFileOperation);
    });

    test('it passes undefined script when not provided in resource params', async () => {
      const builder = createBuilder({}, 'output.txt');

      const resource: ResourceInfo<OpInput<CreateFileOperation>> = {
        id: 'mycomponent:test-file',
        name: 'output.txt',
        component: 'mycomponent',
        type: 'file',
        params: {},
      };

      const result = await builder.build(resource);

      expect(result.input.script).toBeUndefined();
    });
  });

  // Cleanup
  afterEach(async () => {
    await rimraf(rootDir);
  });
});
