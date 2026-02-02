import { getContext } from '@';
import { fdir as Fdir } from 'fdir';
import { stat, statfs } from 'node:fs/promises';
import { join } from 'node:path';
import { join as posixJoin } from 'node:path/posix';
import { Transform, Writable } from 'node:stream';
import pMap from 'p-map';

import { DockerPublishConfig } from '@/config/schema.js';
import { ResourceInfo, SentinelFileBasedBuilder } from '@/monorepo';
import { OpInput, OpOutput } from '@/operations/index.js';
import { FilePrerequisite, GitPrerequisitePlugin } from '@/prerequisites';

import {
  ResourceBuildContext,
  ResourceFactory,
} from '../../monorepo/resources/ResourceFactory.js';
import { BuildImageOperation } from '../operations/index.js';

/**
 * Configuration for a docker/image resource.
 * Extends build operation input with image naming options.
 */
type DockerImageResourceConfig = Partial<OpInput<BuildImageOperation>> & {
  /** Image name (without project prefix or tag). Defaults to component name. */
  image?: string;
  /** Image tag. Defaults to defaults.docker.tag or 'latest'. */
  tag?: string;
  /** Publishing configuration (overrides defaults.docker.publish). */
  publish?: DockerPublishConfig;
};

class DockerImageResourceBuilder extends SentinelFileBasedBuilder<
  DockerImageResourceConfig,
  OpOutput<BuildImageOperation>,
  { mtime: number }
> {
  protected dockerContext: string;

  constructor(
    protected buildContext: ResourceBuildContext<DockerImageResourceConfig>,
  ) {
    super(buildContext);

    this.dockerContext = this.config?.context
      ? this.config.context[0] === '/'
        ? buildContext.monorepo.join(this.config.context)
        : buildContext.component.join(this.config.context)
      : buildContext.monorepo.join(buildContext.component.rootDir);
  }

  async getReference(): Promise<string> {
    const imageName = this.config?.image || this.component.name;
    const tag =
      this.config?.tag || this.monorepo.defaults.docker?.tag || 'latest';

    const fullImageName = [this.monorepo.name, imageName].join('/');
    return this.monorepo.expand(`${fullImageName}:${tag}`);
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
    _resource: ResourceInfo<DockerImageResourceConfig>,
    out: Writable,
  ) {
    // Ensure the folder exists
    await statfs(this.dockerContext);

    const crawler = new Fdir();
    const sources = await crawler
      .withRelativePaths()
      .crawl(this.dockerContext)
      .withPromise();

    // Build operation input - note that 'image' from config is only used for
    // getReference(), it's not passed to the build operation
    const buildParams = {
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
      platform:
        this.config?.platform || this.monorepo.defaults.docker?.platform,
    };

    return {
      input: buildParams as DockerImageResourceConfig,
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

  /**
   * Publish (push) the docker image to a registry.
   * Uses configuration from defaults.docker.publish and resource-level params.publish.
   */
  async publish(
    _resource: ResourceInfo<DockerImageResourceConfig>,
    out?: Writable,
  ): Promise<void> {
    const { docker } = getContext();

    const reference = await this.getReference();

    // Merge defaults with resource-specific config (resource wins)
    const defaults = this.monorepo.defaults.docker?.publish;
    const resourceConfig = this.config?.publish;
    const rawRegistry = resourceConfig?.registry ?? defaults?.registry;
    const rawTag = resourceConfig?.tag ?? defaults?.tag;

    // Expand any template variables in publish config
    const expandedRegistry = rawRegistry
      ? await this.monorepo.expand(rawRegistry)
      : undefined;
    const expandedTag = rawTag ? await this.monorepo.expand(rawTag) : undefined;

    // Determine final image name and tag
    const { imgName, tag } = await this.retagIfNecessary(
      docker,
      reference,
      expandedTag,
      expandedRegistry,
    );

    // Push the image
    await this.pushImage(docker, imgName, tag, out);
  }

  private async retagIfNecessary(
    docker: ReturnType<typeof getContext>['docker'],
    fullName: string,
    retag?: string,
    registry?: string,
  ) {
    let [imgName, tag] = fullName.split(':');

    // Retag if necessary
    if (retag || registry) {
      const dockerImage = docker.getImage(fullName);

      tag = retag || tag;
      imgName = registry ? posixJoin(registry, imgName) : imgName;

      await dockerImage.tag({
        tag,
        repo: imgName,
      });
    }

    return { imgName, tag };
  }

  private async pushImage(
    docker: ReturnType<typeof getContext>['docker'],
    repo: string,
    tag: string,
    out?: Writable,
  ) {
    const dockerImage = docker.getImage(`${repo}:${tag}`);

    const stream = await dockerImage.push({
      authconfig: {
        username: process.env.DOCKER_USERNAME,
        password: process.env.DOCKER_PASSWORD,
      },
    });

    const transform = new Transform({
      transform(chunk, encoding, callback) {
        const lines = chunk.toString().split('\n');
        lines.forEach((line: string) => {
          if (!line.trim()) {
            return;
          }

          try {
            const { status } = JSON.parse(line.trim());
            out?.write(status + '\n');
          } catch (error) {
            out?.write(error + '\n');
          }
        });

        callback();
      },
    });

    if (out) {
      stream.pipe(transform).pipe(out);
    }

    await new Promise((resolve, reject) => {
      docker.modem.followProgress(stream, (err, data) => {
        if (err) {
          return reject(err);
        }

        const hasError = data.find((d) => Boolean(d.error));
        if (hasError) {
          return reject(new Error(hasError.error));
        }

        resolve(null);
      });
    });
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
