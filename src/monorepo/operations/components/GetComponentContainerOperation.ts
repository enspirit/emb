import { getContext } from '@';
import { ContainerInfo } from 'dockerode';

import { ListContainersOperation } from '@/docker/index.js';
import { Component } from '@/monorepo/component.js';
import { IOperation } from '@/operations';

export class GetComponentContainerOperation
  implements IOperation<Component, ContainerInfo>
{
  async run(component: Component | string): Promise<ContainerInfo> {
    const { monorepo } = getContext();

    const cmpName = component instanceof Component ? component.name : component;

    const matching = await monorepo.run(new ListContainersOperation(), {
      filters: {
        label: [`emb/project=${monorepo.name}`, `emb/component=${cmpName}`],
      },
    });

    if (matching.length === 0) {
      throw new Error(`Could not find a running container for '${cmpName}'`);
    }

    if (matching.length > 1) {
      throw new Error(`More than one running container found for '${cmpName}'`);
    }

    return matching[0];
  }
}
