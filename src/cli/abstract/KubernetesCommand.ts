import { Flags } from '@oclif/core';

import { BaseCommand } from './BaseCommand.js';

export abstract class KubernetesCommand extends BaseCommand {
  static baseFlags = {
    ...BaseCommand.baseFlags,
    namespace: Flags.string({
      name: 'namespace',
      description: 'The Kubernetes namespace to target',
      aliases: ['ns'],
      char: 'n',
      required: true,
      env: 'K8S_NAMESPACE',
    }),
  };
}
