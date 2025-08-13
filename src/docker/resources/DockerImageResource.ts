import { stat } from 'node:fs/promises';

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

  const plugin = new GitPrerequisitePlugin();
  const sources = await plugin.collect(component);

  const context = fromConfig.context
    ? component.join(fromConfig.context)
    : component.rootDir;

  const buildParams: OpInput<BuildImageOperation> = {
    context,
    dockerfile: fromConfig.dockerfile || 'Dockerfile',
    src: sources.map((s) => s.path),
    buildArgs: fromConfig.buildArgs || {},
    tag: [monorepo.name, fromConfig.tag || component.name].join('/'),
    labels: {
      ...fromConfig.labels,
      'emb/project': monorepo.name,
      'emb/component': component.name,
    },
    target: fromConfig.target,
  };

  const lastUpdatedInfo = async (sources: Array<FilePrerequisite>) => {
    const stats = await Promise.all(
      sources.map(async (s) => {
        const stats = await stat(component.join(s.path));

        return {
          time: stats.mtime,
          path: s.path,
        };
      }),
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
