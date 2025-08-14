import { fdir as Fdir } from 'fdir';
import { stat, statfs } from 'node:fs/promises';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import pMap from 'p-map';

import { OpInput, OpOutput } from '@/operations/index.js';
import { FilePrerequisite, GitPrerequisitePlugin } from '@/prerequisites';

import {
  ResourceBuildContext,
  ResourceBuilderInfo,
  ResourceFactory,
  SentinelData,
} from '../../monorepo/resources/ResourceFactory.js';
import { BuildImageOperation } from '../operations/index.js';

class DockerImageResourceBuilder
  implements
    ResourceBuilderInfo<
      OpInput<BuildImageOperation>,
      OpOutput<BuildImageOperation>
    >
{
  protected context: string;

  constructor(protected buildContext: ResourceBuildContext) {
    this.context = this.config.context
      ? this.config.context[0] === '/'
        ? buildContext.monorepo.join(this.config.context)
        : buildContext.component.join(this.config.context)
      : buildContext.monorepo.join(buildContext.component.rootDir);
  }

  get monorepo() {
    return this.buildContext.monorepo;
  }

  get config() {
    return (this.buildContext.config.params || {}) as Partial<
      OpInput<BuildImageOperation>
    >;
  }

  get component() {
    return this.buildContext.component;
  }

  async build(out: Writable) {
    // Ensure the folder exists
    await statfs(this.context);

    const imageName = [
      this.monorepo.name,
      this.config.tag || this.component.name,
    ].join('/');
    const tagName =
      this.config.tag || this.monorepo.defaults.docker?.tag || 'latest';

    const crawler = new Fdir();
    const sources = await crawler
      .withRelativePaths()
      .crawl(this.context)
      .withPromise();

    const buildParams: OpInput<BuildImageOperation> = {
      context: this.context,
      dockerfile: this.config.dockerfile || 'Dockerfile',
      src: sources,
      buildArgs: await this.monorepo.expand({
        ...this.monorepo.defaults.docker?.buildArgs,
        ...this.config.buildArgs,
      }),
      tag: await this.monorepo.expand(`${imageName}:${tagName}`),
      labels: await this.monorepo.expand({
        ...this.config.labels,
        'emb/project': this.monorepo.name,
        'emb/component': this.component.name,
        'emb/flavor': this.monorepo.currentFlavor,
      }),
      target: this.config.target,
    };

    return {
      input: buildParams,
      operation: new BuildImageOperation(out),
    };
  }

  async mustBuild(sentinel: SentinelData<undefined | unknown> | undefined) {
    const plugin = new GitPrerequisitePlugin();
    const sources = await plugin.collect(this.context);
    const lastUpdated = await this.lastUpdatedInfo(sources);

    if (!sentinel) {
      return lastUpdated;
    }

    return lastUpdated && lastUpdated.time.getTime() > sentinel.mtime
      ? lastUpdated
      : undefined;
  }

  private async lastUpdatedInfo(sources: Array<FilePrerequisite>) {
    const stats = await pMap(
      sources,
      async (s) => {
        const stats = await stat(join(this.context, s.path));

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
  }
}

// Bring better abstraction and register as part of the plugin initialization
ResourceFactory.register(
  'docker/image',
  async (context) => new DockerImageResourceBuilder(context),
);
