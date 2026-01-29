import { V1Pod } from '@kubernetes/client-node';
import * as z from 'zod';

import { CliError } from '@/errors.js';
import { Component } from '@/monorepo';
import { AbstractOperation } from '@/operations';

const schema = z.object({
  component: z
    .instanceof(Component)
    .describe('The component to get the pod for'),
  namespace: z.string().describe('The Kubernetes namespace'),
});

export interface GetComponentPodOutput {
  container: string;
  pod: V1Pod;
}

export class GetComponentPodOperation extends AbstractOperation<
  typeof schema,
  GetComponentPodOutput
> {
  constructor() {
    super(schema);
  }

  protected async _run(
    input: z.input<typeof schema>,
  ): Promise<GetComponentPodOutput> {
    const { kubernetes, monorepo } = this.context;
    const { component, namespace } = input;

    const k8sConfig = component.config.kubernetes;
    const projectK8sConfig = monorepo.config.defaults?.kubernetes;

    // Build label selector: use explicit config or default convention
    // Priority: component.kubernetes.selector > project.kubernetes.selectorLabel > default
    const selectorLabel =
      projectK8sConfig?.selectorLabel ?? 'app.kubernetes.io/component';
    const labelSelector =
      k8sConfig?.selector ?? `${selectorLabel}=${component.name}`;

    // List pods matching the selector
    const res = await kubernetes.core.listNamespacedPod({
      namespace,
      labelSelector,
    });

    // Filter to ready pods
    const readyPods = res.items.filter((pod) => {
      const conditions = pod.status?.conditions ?? [];
      return conditions.some((c) => c.type === 'Ready' && c.status === 'True');
    });

    if (readyPods.length === 0) {
      throw new CliError(
        'K8S_NO_READY_PODS',
        `No ready pods found for component "${component.name}" in namespace "${namespace}"`,
        [
          `Label selector used: ${labelSelector}`,
          `Check pod status: kubectl get pods -l ${labelSelector} -n ${namespace}`,
          `To use a different selector, add kubernetes.selector to component config`,
        ],
      );
    }

    // Get first ready pod
    const pod = readyPods[0];

    // Determine container name
    const containers = pod.spec?.containers ?? [];

    if (containers.length === 0) {
      throw new CliError(
        'K8S_NO_CONTAINERS',
        `Pod "${pod.metadata?.name}" has no containers`,
      );
    }

    let containerName: string;

    if (k8sConfig?.container) {
      // Use explicit container config
      containerName = k8sConfig.container;
      const containerExists = containers.some((c) => c.name === containerName);
      if (!containerExists) {
        throw new CliError(
          'K8S_CONTAINER_NOT_FOUND',
          `Container "${containerName}" not found in pod "${pod.metadata?.name}"`,
          [
            `Available containers: ${containers.map((c) => c.name).join(', ')}`,
            `Update kubernetes.container in component config if needed`,
          ],
        );
      }
    } else if (containers.length === 1) {
      // Single container pod: use it
      containerName = containers[0].name;
    } else {
      // Multi-container pod: require explicit config
      throw new CliError(
        'K8S_MULTI_CONTAINER',
        `Pod "${pod.metadata?.name}" has multiple containers, explicit container config required`,
        [
          `Available containers: ${containers.map((c) => c.name).join(', ')}`,
          `Add kubernetes.container to component "${component.name}" config:`,
          `  components:`,
          `    ${component.name}:`,
          `      kubernetes:`,
          `        container: <container-name>`,
        ],
      );
    }

    return { pod, container: containerName };
  }
}
