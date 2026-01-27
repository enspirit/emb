import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  Component,
  CreateFileOperation,
  Monorepo,
  ResourceInfo,
} from '@/monorepo';
import { OpInput } from '@/operations/index.js';

import { FileResourceBuilder } from '../../../../src/monorepo/resources/FileResourceBuilder.js';
import { ResourceBuildContext } from '../../../../src/monorepo/resources/ResourceFactory.js';

// FileResourceBuilder expects params where 'path' is optional since it can derive from config name
type FileResourceParams = Partial<OpInput<CreateFileOperation>>;

describe('Monorepo / Resources / FileResourceBuilder', () => {
  let mockComponent: Component;
  let mockMonorepo: Monorepo;
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

    mockMonorepo = {
      expand: vi.fn((str: string) => Promise.resolve(str)),
    } as unknown as Monorepo;
  });

  const createBuilder = (
    params: FileResourceParams = {},
    name = 'test-file.txt',
    monorepo: Monorepo = mockMonorepo,
  ) => {
    const config: ResourceInfo<FileResourceParams> = {
      id: 'mycomponent:test-file',
      name,
      component: 'mycomponent',
      type: 'file',
      params,
    };

    const context = {
      config,
      component: mockComponent,
      monorepo,
    } as ResourceBuildContext<OpInput<CreateFileOperation>>;

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

      const resource = {
        id: 'mycomponent:test-file',
        name: 'output.txt',
        component: 'mycomponent',
        type: 'file',
        params: { script: 'echo hello' },
      } as ResourceInfo<OpInput<CreateFileOperation>>;

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

      const resource = {
        id: 'mycomponent:test-file',
        name: 'output.txt',
        component: 'mycomponent',
        type: 'file',
        params: {},
      } as ResourceInfo<OpInput<CreateFileOperation>>;

      const result = await builder.build(resource);

      expect(result.input.script).toBeUndefined();
    });

    test('it passes content to operation input', async () => {
      const builder = createBuilder({ content: 'file content' }, 'output.txt');

      const resource = {
        id: 'mycomponent:test-file',
        name: 'output.txt',
        component: 'mycomponent',
        type: 'file',
        params: { content: 'file content' },
      } as ResourceInfo<OpInput<CreateFileOperation>>;

      const result = await builder.build(resource);

      expect(result.input.content).toBe('file content');
    });

    test('it expands content using monorepo.expand', async () => {
      // eslint-disable-next-line no-template-curly-in-string
      const templateContent = 'SECRET=${op:test}';
      const expandMock = vi.fn((str: string) =>
        Promise.resolve(str.replace(templateContent, 'SECRET=expanded-secret')),
      );
      const monorepo = { expand: expandMock } as unknown as Monorepo;

      const builder = createBuilder(
        { content: templateContent },
        'output.txt',
        monorepo,
      );

      const resource = {
        id: 'mycomponent:test-file',
        name: 'output.txt',
        component: 'mycomponent',
        type: 'file',
        params: { content: templateContent },
      } as ResourceInfo<OpInput<CreateFileOperation>>;

      const result = await builder.build(resource);

      expect(expandMock).toHaveBeenCalledWith(templateContent);
      expect(result.input.content).toBe('SECRET=expanded-secret');
    });

    test('it does not call expand when content is undefined', async () => {
      const expandMock = vi.fn();
      const monorepo = { expand: expandMock } as unknown as Monorepo;

      const builder = createBuilder(
        { script: 'echo test' },
        'output.txt',
        monorepo,
      );

      const resource = {
        id: 'mycomponent:test-file',
        name: 'output.txt',
        component: 'mycomponent',
        type: 'file',
        params: { script: 'echo test' },
      } as ResourceInfo<OpInput<CreateFileOperation>>;

      await builder.build(resource);

      expect(expandMock).not.toHaveBeenCalled();
    });
  });

  // Cleanup
  afterEach(async () => {
    await rimraf(rootDir);
  });
});
