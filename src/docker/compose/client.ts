import { Monorepo } from '@';
import { execa } from 'execa';

export type ComposeContainer = {
  Name: string;
  ID: string;
  State: 'exited' | 'running';
};

export type ComposeService = {
  name: string;
  containers: Array<ComposeContainer>;
};

export type ComposeServices = Map<string, ComposeService>;

export type GetContainerOptions = {
  mustBeRunning: boolean;
  mustBeUnique: boolean;
};

export const DefaultGetContainerOptions: GetContainerOptions = {
  mustBeRunning: true,
  mustBeUnique: true,
};

export class DockerComposeClient {
  protected containers?: ComposeServices;

  constructor(protected monorepo: Monorepo) {}

  async init() {
    await this.loadContainers();
  }

  async getContainer(
    serviceName: string,
    options: Partial<GetContainerOptions> = DefaultGetContainerOptions,
  ) {
    const getOptions = { ...DefaultGetContainerOptions, ...options };

    await this.loadContainers();

    const service = this.containers?.get(serviceName);
    if (!service) {
      throw new Error(`No compose service found with name ${serviceName}`);
    }

    const containers = getOptions.mustBeRunning
      ? service.containers.filter((c) => c.State === 'running')
      : service.containers;

    if (containers.length === 0) {
      throw new Error(`No container found for service ${serviceName}`);
    }

    if (containers.length > 1 && getOptions.mustBeUnique) {
      throw new Error(`Multiple containers found`);
    }

    return containers[0].ID;
  }

  private async loadContainers(force = false) {
    if (this.containers && !force) {
      return;
    }

    const { stdout } = await execa({
      cwd: this.monorepo.rootDir,
    })`docker compose ps -a --format json`;

    this.containers = stdout
      .split('\n')
      .map((l) => JSON.parse(l))
      .reduce<ComposeServices>((services, entry) => {
        if (!services.has(entry.Service)) {
          services.set(entry.Service, {
            name: entry.Service,
            containers: [],
          });
        }

        const svc = services.get(entry.Service);
        svc?.containers.push(entry);

        return services;
      }, new Map());
  }
}
