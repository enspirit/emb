import { DockerComposeClient, EmbContext, getContext, setContext } from '@';
import { Command } from '@oclif/core';
import Dockerode from 'dockerode';

import { loadConfig } from '@/config/index.js';
import { Monorepo } from '@/monorepo/monorepo.js';

import { withMarker } from '../utils.js';

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

      const compose = new DockerComposeClient(monorepo);

      this.context = setContext({
        docker: new Dockerode(),
        monorepo,
        compose,
      });
    } catch (error) {
      this.error(error as Error);
    }
  }
}
