import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { Component, Monorepo, ResourceInfo } from '@/monorepo';
import { OpInput } from '@/operations/index.js';

import {
  FetchOpFileOperation,
  OpFileResourceBuilder,
} from '../../../../src/monorepo/resources/OpFileResourceBuilder.js';
import { ResourceBuildContext } from '../../../../src/monorepo/resources/ResourceFactory.js';

type OpFileParams = Partial<OpInput<FetchOpFileOperation>>;

describe('Monorepo / Resources / OpFileResourceBuilder', () => {
  let mockComponent: Component;
  let mockMonorepo: Monorepo;
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'embOpFileResource'));
    await mkdir(join(rootDir, 'mycomponent'), { recursive: true });

    mockComponent = {
      name: 'mycomponent',
      rootDir: 'mycomponent',
      join: vi.fn((p: string) => join(rootDir, 'mycomponent', p)),
      relative: vi.fn((p: string) => join('mycomponent', p)),
    } as unknown as Component;

    mockMonorepo = {} as unknown as Monorepo;
  });

  afterEach(async () => {
    await rimraf(rootDir);
  });

  const createBuilder = (params: OpFileParams, name = 'keystore.jks') => {
    const config: ResourceInfo<OpFileParams> = {
      id: 'mycomponent:keystore',
      name,
      component: 'mycomponent',
      type: 'op/file',
      params,
    };

    const context = {
      config,
      component: mockComponent,
      monorepo: mockMonorepo,
    } as ResourceBuildContext<OpInput<FetchOpFileOperation>>;

    return new OpFileResourceBuilder(context);
  };

  describe('#getPath()', () => {
    test('defaults to the resource name', async () => {
      const builder = createBuilder(
        { reference: 'op://V/I/keystore.jks' },
        'fastlane/keystore.jks',
      );
      const path = await builder.getPath();
      expect(path).toBe(join(rootDir, 'mycomponent', 'fastlane/keystore.jks'));
    });

    test('honours params.path override', async () => {
      const builder = createBuilder({
        reference: 'op://V/I/keystore.jks',
        path: 'out/my.jks',
      });
      const path = await builder.getPath();
      expect(path).toBe(join(rootDir, 'mycomponent', 'out/my.jks'));
    });
  });

  describe('#mustBuild()', () => {
    test('true when file does not exist', async () => {
      const builder = createBuilder(
        { reference: 'op://V/I/file' },
        'missing.jks',
      );
      expect(await builder.mustBuild()).toBe(true);
    });

    test('undefined when file exists', async () => {
      await writeFile(join(rootDir, 'mycomponent', 'there.jks'), 'x');
      const builder = createBuilder(
        { reference: 'op://V/I/file' },
        'there.jks',
      );
      expect(await builder.mustBuild()).toBeUndefined();
    });
  });

  describe('#build()', () => {
    test('produces a FetchOpFileOperation with reference and resolved dest path', async () => {
      const builder = createBuilder(
        {
          reference:
            'op://client.coverseal/android-keystore.jks/Coverseal.store',
        },
        'fastlane/keystore.jks',
      );
      const resource = {
        id: 'mycomponent:keystore',
        name: 'fastlane/keystore.jks',
        component: 'mycomponent',
        type: 'op/file',
        params: {
          reference:
            'op://client.coverseal/android-keystore.jks/Coverseal.store',
        },
      } as ResourceInfo<OpInput<FetchOpFileOperation>>;

      const result = await builder.build(resource);

      expect(result.input).toEqual({
        reference: 'op://client.coverseal/android-keystore.jks/Coverseal.store',
        path: join(rootDir, 'mycomponent', 'fastlane/keystore.jks'),
      });
      expect(result.operation).toBeInstanceOf(FetchOpFileOperation);
    });

    test('errors if reference is missing', async () => {
      const builder = createBuilder({}, 'dest.jks');
      const resource = {
        id: 'mycomponent:keystore',
        name: 'dest.jks',
        component: 'mycomponent',
        type: 'op/file',
        params: {},
      } as ResourceInfo<OpInput<FetchOpFileOperation>>;

      await expect(builder.build(resource)).rejects.toThrow(
        "requires a 'reference' param",
      );
    });
  });
});
