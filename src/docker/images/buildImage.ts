import { Writable } from 'node:stream';

import { getContext } from '@/cli';
import {
  decodeBuildkitStatusResponse,
  DockerComponentBuild,
  getSentinelFile,
} from '@/docker';
import { Component } from '@/monorepo';
import { FilePrerequisitePlugin } from '@/prerequisites';

export type MobyTrace = { aux: unknown; error?: string; id: string };
export type Progress = { error?: string; name?: string };
export type DockerBuildExtraOptions = {
  output?: Writable;
};

export type BuildDockerImageOutput = DockerComponentBuild & {
  traces: Array<MobyTrace>;
};

export const buildDockerImage = async (
  component: Component,
  opts: DockerBuildExtraOptions = {},
  progress?: (progress: Progress) => void,
): Promise<BuildDockerImageOutput | undefined> => {
  const cmp = await component.toDockerBuild();
  const files = (cmp.prerequisites || []).map((f) => f.path);
  const { docker, monorepo } = getContext();

  /** SENTINEL LOGIC */
  // TODO: make configurable
  const prereqPlugin = new FilePrerequisitePlugin();

  const preBuildMeta = await prereqPlugin.meta(
    component,
    cmp.prerequisites,
    'pre',
  );
  const sentinelFile = getSentinelFile(component);

  let lastValue: string | undefined;
  try {
    lastValue = (await monorepo.store.readFile(sentinelFile)).toString();
  } catch {
    lastValue = undefined;
  }

  if (lastValue) {
    const diff = await prereqPlugin.diff(
      component,
      cmp.prerequisites,
      lastValue,
      preBuildMeta,
    );

    if (!diff) {
      return;
    }
  }

  const stream = await docker.buildImage(
    {
      context: cmp.context,
      src: [...files],
    },
    {
      buildargs: cmp.buildArgs,
      dockerfile: cmp.dockerfile,
      labels: cmp.labels,
      t: cmp.name + ':' + (cmp.tag || 'latest'),
      target: cmp.target,
      version: '2',
    },
  );

  if (opts.output) {
    stream.pipe(opts.output);
  }

  stream.on('close', async () => {
    const sentinelValue = await prereqPlugin.meta(
      component,
      cmp.prerequisites,
      'post',
    );

    await monorepo.store.writeFile(sentinelFile, sentinelValue);
  });

  return new Promise((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err, traces) => {
        return err ? reject(err) : resolve({ ...cmp, traces });
      },
      async (trace: MobyTrace) => {
        if (trace.error) {
          reject(new Error(trace.error));
        } else {
          try {
            const { vertexes } = await decodeBuildkitStatusResponse(
              trace.aux as string,
            );
            vertexes.forEach((v: { name: string }) => {
              progress?.(v);
            });
          } catch (error) {
            console.error(error);
          }
        }
      },
    );
  });
};
