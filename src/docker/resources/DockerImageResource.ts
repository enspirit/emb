import { stat, statfs } from 'node:fs/promises';
import { join } from 'node:path';
import pMap from 'p-map';

import { OpInput, OpOutput } from '@/operations/index.js';
import { FilePrerequisite, GitPrerequisitePlugin } from '@/prerequisites';

import {
  ResourceFactory,
  ResourceOperationFactory,
} from '../../monorepo/resources/ResourceFactory.js';
import { BuildImageOperation } from '../operations/index.js';

const DockerImageOpFactory: ResourceOperationFactory<
  OpInput<BuildImageOperation>,
  OpOutput<BuildImageOperation>
> = async ({ config, component, monorepo }) => {
  const fromConfig = (config.params || {}) as Partial<
    OpInput<BuildImageOperation>
  >;

  const context = fromConfig.context
    ? fromConfig.context[0] === '/'
      ? monorepo.join(fromConfig.context)
      : component.join(fromConfig.context)
    : monorepo.join(component.rootDir);

  // Ensure the folder exists
  await statfs(context);

  const plugin = new GitPrerequisitePlugin();
  const sources = await plugin.collect(context);
  const imageName = [monorepo.name, fromConfig.tag || component.name].join('/');
  const tagName = fromConfig.tag || monorepo.defaults.docker?.tag || 'latest';

  const buildParams: OpInput<BuildImageOperation> = {
    context,
    dockerfile: fromConfig.dockerfile || 'Dockerfile',
    src: sources.map((s) => s.path),
    buildArgs: fromConfig.buildArgs || {},
    tag: `${imageName}:${tagName}`,
    labels: {
      ...fromConfig.labels,
      'emb/project': monorepo.name,
      'emb/component': component.name,
      'emb/flavor': monorepo.currentFlavor,
    },
    target: fromConfig.target,
  };

  const lastUpdatedInfo = async (sources: Array<FilePrerequisite>) => {
    const stats = await pMap(
      sources,
      async (s) => {
        const stats = await stat(join(context, s.path));

        return {
          time: stats.mtime,
          path: s.path,
        };
      },
      { concurrency: 30 },
    );

    if (stats.length === 0) {
      return 0;
    }

    return stats.reduce((last, entry) => {
      return last.time > entry.time ? last : entry;
    }, stats[0]);
  };

  return {
    async mustBuild(sentinel) {
      const lastUpdated = await lastUpdatedInfo(sources);
      if (!sentinel) {
        return lastUpdated;
      }

      return lastUpdated && lastUpdated.time.getTime() > sentinel.mtime
        ? lastUpdated
        : undefined;
    },
    input: await monorepo.expand(buildParams),
    operation: new BuildImageOperation(),
  };
};

// Bring better abstraction and register as part of the plugin initialization
ResourceFactory.register('docker/image', DockerImageOpFactory);
