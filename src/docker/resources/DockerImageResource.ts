import { fdir as Fdir } from 'fdir';
import { stat, statfs } from 'node:fs/promises';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import pMap from 'p-map';

import { ResourceInfo, SentinelFileBasedBuilder } from '@/monorepo';
import { OpInput, OpOutput } from '@/operations/index.js';
import { FilePrerequisite, GitPrerequisitePlugin } from '@/prerequisites';

import {
  ResourceBuildContext,
  ResourceFactory,
} from '../../monorepo/resources/ResourceFactory.js';
import { BuildImageOperation } from '../operations/index.js';

class DockerImageResourceBuilder extends SentinelFileBasedBuilder<
  OpInput<BuildImageOperation>,
  OpOutput<BuildImageOperation>,
  { mtime: number }
> {
  protected dockerContext: string;

  constructor(
    protected buildContext: ResourceBuildContext<OpInput<BuildImageOperation>>,
  ) {
    super(buildContext);

    this.dockerContext = this.config?.context
      ? this.config.context[0] === '/'
        ? buildContext.monorepo.join(this.config.context)
        : buildContext.component.join(this.config.context)
      : buildContext.monorepo.join(buildContext.component.rootDir);
  }

  async getReference(): Promise<string> {
    const imageName = [
      this.monorepo.name,
      this.config?.tag || this.component.name,
    ].join('/');
    const tagName =
      this.config?.tag || this.monorepo.defaults.docker?.tag || 'latest';

    return this.monorepo.expand(`${imageName}:${tagName}`);
  }

  get monorepo() {
    return this.buildContext.monorepo;
  }

  get config() {
    return this.buildContext.config.params;
  }

  get component() {
    return this.buildContext.component;
  }

  async _build(
    _resource: ResourceInfo<OpInput<BuildImageOperation>>,
    out: Writable,
  ) {
    // Ensure the folder exists
    await statfs(this.dockerContext);

    const crawler = new Fdir();
    const sources = await crawler
      .withRelativePaths()
      .crawl(this.dockerContext)
      .withPromise();

    const buildParams: OpInput<BuildImageOperation> = {
      context: this.dockerContext,
      dockerfile: this.config?.dockerfile || 'Dockerfile',
      src: sources,
      buildArgs: await this.monorepo.expand({
        ...this.monorepo.defaults.docker?.buildArgs,
        ...this.config?.buildArgs,
      }),
      tag: await this.getReference(),
      labels: await this.monorepo.expand({
        ...this.config?.labels,
        'emb/project': this.monorepo.name,
        'emb/component': this.component.name,
        'emb/flavor': this.monorepo.currentFlavor,
      }),
      target: this.config?.target,
    };

    return {
      input: buildParams,
      operation: new BuildImageOperation(out),
    };
  }

  async _mustBuild() {
    const plugin = new GitPrerequisitePlugin();
    const sources = await plugin.collect(this.dockerContext);
    const lastUpdated = await this.lastUpdatedInfo(sources);

    if (!lastUpdated) {
      return;
    }

    return { mtime: lastUpdated.time.getTime() };
  }

  private async lastUpdatedInfo(sources: Array<FilePrerequisite>) {
    const stats = await pMap(
      sources,
      async (s) => {
        const stats = await stat(join(this.dockerContext, s.path));

        return {
          time: stats.mtime,
          path: s.path,
        };
      },
      { concurrency: 30 },
    );

    if (stats.length === 0) {
      return;
    }

    return stats.reduce((last, entry) => {
      return last.time > entry.time ? last : entry;
    }, stats[0]);
  }
}

ResourceFactory.register('docker/image', DockerImageResourceBuilder);
