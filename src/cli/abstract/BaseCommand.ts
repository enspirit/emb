import { DockerComposeClient, EmbContext, getContext, setContext } from '@';
import { Command, Flags } from '@oclif/core';
import Dockerode from 'dockerode';

import { loadConfig } from '@/config/index.js';
import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo/monorepo.js';

import { withMarker } from '../utils.js';

export abstract class BaseCommand extends Command {
  protected context!: EmbContext;
  static baseFlags = {
    verbose: Flags.boolean({
      name: 'verbose',
      allowNo: true,
    }),
  };

  public async init(): Promise<void> {
    const { flags } = await this.parse();

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

      if (flags.verbose) {
        monorepo.setTaskRenderer('verbose');
      }

      const compose = new DockerComposeClient(monorepo);

      this.context = setContext({
        docker: new Dockerode(),
        monorepo,
        compose,
        kubernetes: createKubernetesClient(),
      });
    } catch (error) {
      this.error(error as Error);
    }
  }
}
