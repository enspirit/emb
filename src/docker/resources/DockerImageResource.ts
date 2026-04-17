import type { Ignore } from '@balena/dockerignore';

import { getContext } from '@';
import * as dockerignoreModule from '@balena/dockerignore';
import { fdir as Fdir } from 'fdir';
import { readFile, statfs } from 'node:fs/promises';
import { join } from 'node:path';
import { join as posixJoin } from 'node:path/posix';
import { Transform, Writable } from 'node:stream';

import { DockerPublishConfig } from '@/config/schema.js';
import { ResourceInfo, SentinelFileBasedBuilder } from '@/monorepo';
import { OpInput, OpOutput } from '@/operations/index.js';

import {
  ResourceBuildContext,
  ResourceFactory,
} from '../../monorepo/resources/ResourceFactory.js';
import { getDockerAuthConfig } from '../credentials.js';
import { BuildImageOperation } from '../operations/index.js';
import { computeAlways } from './rebuildStrategies/always.js';
import { computeAuto } from './rebuildStrategies/auto.js';
import { StrategyResult, WatchedPath } from './rebuildStrategies/types.js';
import { computeWatchPaths } from './rebuildStrategies/watchPaths.js';
import {
  RebuildTriggerSource,
  resolveRebuildTrigger,
} from './resolveRebuildTrigger.js';

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

export type DockerImageSentinel = {
  mtime: number;
  strategy: 'always' | 'auto' | 'watch-paths';
  source: RebuildTriggerSource;
  reason: string;
  watched?: WatchedPath[];
};

export const isDockerImageSentinel = (
  value: unknown,
): value is DockerImageSentinel => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<DockerImageSentinel>;
  return (
    typeof candidate.mtime === 'number' &&
    typeof candidate.reason === 'string' &&
    (candidate.strategy === 'auto' ||
      candidate.strategy === 'always' ||
      candidate.strategy === 'watch-paths') &&
    (candidate.source === 'resource' ||
      candidate.source === 'flavor' ||
      candidate.source === 'builtin')
  );
};

/**
 * Load `.dockerignore` from the build context and return a predicate that
 * returns true for paths that should be kept (i.e. not ignored).
 *
 * Returns undefined when no `.dockerignore` is present, so callers can skip
 * any filtering work.
 */
// `@balena/dockerignore` is CJS (`module.exports = factory`), so under
// nodenext the default import lands on the namespace — unwrap to the factory.
type DockerignoreFactory = () => Ignore;
const nsAny = dockerignoreModule as unknown as DockerignoreFactory & {
  default?: DockerignoreFactory;
};
const dockerignore: DockerignoreFactory = nsAny.default ?? nsAny;

const loadDockerignoreFilter = async (
  contextDir: string,
): Promise<((relativePath: string) => boolean) | undefined> => {
  let contents: string;
  try {
    contents = await readFile(join(contextDir, '.dockerignore'), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }

  return dockerignore().add(contents).createFilter();
};

class DockerImageResourceBuilder extends SentinelFileBasedBuilder<
  DockerImageResourceConfig,
  OpOutput<BuildImageOperation>,
  DockerImageSentinel
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

    const ignoreFilter = await loadDockerignoreFilter(this.dockerContext);
    const crawler = new Fdir().withRelativePaths();
    if (ignoreFilter) {
      crawler.filter((path, isDirectory) => isDirectory || ignoreFilter(path));
    }

    const sources = await crawler.crawl(this.dockerContext).withPromise();

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

  async _mustBuild(
    resource: ResourceInfo<DockerImageResourceConfig>,
  ): Promise<DockerImageSentinel | undefined> {
    const flavorName = this.monorepo.currentFlavor;
    const flavor = this.monorepo.flavors[flavorName]
      ? this.monorepo.flavor(flavorName)
      : undefined;
    const trigger = resolveRebuildTrigger({
      resource: resource.rebuildTrigger,
      flavor: flavor?.defaults?.rebuildPolicy?.['docker/image'],
    });

    const ctx = {
      dockerContext: this.dockerContext,
      monorepoRoot: this.monorepo.rootDir,
    };

    let result: StrategyResult | undefined;
    switch (trigger.strategy) {
      case 'always': {
        result = computeAlways();
        break;
      }

      case 'auto': {
        result = await computeAuto(ctx);
        break;
      }

      case 'watch-paths': {
        result = await computeWatchPaths(ctx, trigger.paths);
        break;
      }
    }

    if (!result) {
      return undefined;
    }

    return {
      mtime: result.mtime,
      strategy: trigger.strategy,
      source: trigger.source,
      reason: result.reason,
      ...(result.watched ? { watched: result.watched } : {}),
    };
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
    const imageRef = `${repo}:${tag}`;
    const dockerImage = docker.getImage(imageRef);

    const authconfig = await getDockerAuthConfig(imageRef);
    const stream = await dockerImage.push(authconfig ? { authconfig } : {});

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
}

ResourceFactory.register('docker/image', DockerImageResourceBuilder);
