import { EmbContext, getContext, setContext } from '@';
import { Command, Performance } from '@oclif/core';
import Dockerode from 'dockerode';

import { loadConfig } from '@/config/index.js';
import { Monorepo } from '@/monorepo/monorepo.js';

const withMarker = async <T>(
  owner: string,
  name: string,
  cb: () => Promise<T>,
): Promise<T> => {
  const marker = Performance.mark(owner, name);

  const res = await cb();

  marker?.stop();

  return res;
};

export abstract class BaseCommand extends Command {
  protected context!: EmbContext;

  public async init(): Promise<void> {
    await super.init();

    if (getContext()) {
      return;
    }

    try {
      const { rootDir, config } = await withMarker('emb:config', 'load', () =>
        loadConfig(),
      );

      const monorepo = await withMarker('emb:monorepo', 'init', () => {
        return new Monorepo(config, rootDir).init();
      });

      this.context = setContext({
        docker: new Dockerode(),
        monorepo,
      });
    } catch (error) {
      this.error(error as Error);
    }
  }
}
