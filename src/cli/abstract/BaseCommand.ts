import { DockerComposeClient, EmbContext, getContext, setContext } from '@';
import { Command, Flags } from '@oclif/core';
import Dockerode from 'dockerode';

import { loadConfig } from '@/config/index.js';
import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo/monorepo.js';
import { SecretManager } from '@/secrets';

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

      // Create SecretManager early so plugins can register providers during init
      const secrets = new SecretManager();

      // Set a partial context before monorepo init so plugins can access secrets
      const partialContext = {
        docker: new Dockerode(),
        kubernetes: createKubernetesClient(),
        secrets,
      };
      setContext(partialContext as EmbContext);

      const monorepo = await withMarker('emb:monorepo', 'init', () => {
        return new Monorepo(config, rootDir).init();
      });

      if (flags.verbose) {
        monorepo.setTaskRenderer('verbose');
      }

      const compose = new DockerComposeClient(monorepo);

      this.context = setContext({
        ...partialContext,
        monorepo,
        compose,
      });
    } catch (error) {
      this.error(error as Error);
    }
  }
}
