import {
  DockerComposeClient,
  EmbContext,
  getContext,
  isContextStale,
  resetContext,
  setContext,
} from '@';
import { Command, Flags } from '@oclif/core';

import { loadConfig } from '@/config/index.js';
import { Monorepo } from '@/monorepo/monorepo.js';
import { SecretManager } from '@/secrets';

import { withMarker } from '../utils.js';

export abstract class BaseCommand extends Command {
  protected context!: EmbContext;
  static baseFlags = {
    verbose: Flags.boolean({
      name: 'verbose',
      allowNo: true,
      env: 'EMB_VERBOSE',
    }),
    root: Flags.string({
      char: 'C',
      description:
        'Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.',
      name: 'root',
      required: false,
    }),
  };

  public async init(): Promise<void> {
    const { flags } = await this.parse();

    await super.init();

    // Reset context if EMB_ROOT changed (e.g., in tests switching between examples)
    if (isContextStale()) {
      resetContext();
    }

    if (getContext()) {
      return;
    }

    try {
      const { rootDir, config } = await withMarker('emb:config', 'load', () =>
        loadConfig({ root: flags.root as string | undefined }),
      );

      // Create SecretManager early so plugins can register providers during init
      const secrets = new SecretManager();

      // Set a partial context before monorepo init so plugins can access
      // secrets. No Docker or Kubernetes client here — both are built on first
      // use by getDockerClient() / getKubernetesClient(), so commands that
      // never touch those APIs do not pay to load their SDKs.
      const partialContext = {
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
