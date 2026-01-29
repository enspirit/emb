import { Flags } from '@oclif/core';

import { resolveNamespace } from '@/kubernetes/utils/index.js';

import { BaseCommand } from './BaseCommand.js';

export abstract class KubernetesCommand extends BaseCommand {
  static baseFlags = {
    ...BaseCommand.baseFlags,
    namespace: Flags.string({
      name: 'namespace',
      description: 'The Kubernetes namespace to target',
      aliases: ['ns'],
      char: 'n',
      required: false,
    }),
  };

  /**
   * Resolves the namespace using CLI flag > K8S_NAMESPACE env > config > 'default'
   */
  protected resolveNamespace(cliFlag?: string): string {
    return resolveNamespace({
      cliFlag,
      config: this.context.monorepo.config.defaults?.kubernetes?.namespace,
    });
  }
}
