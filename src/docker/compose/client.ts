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
  protected services?: ComposeServices;

  constructor(protected monorepo: Monorepo) {}

  async init() {
    await this.loadContainers();
  }

  async isService(serviceName: string) {
    await this.init();
    return this.services?.has(serviceName);
  }

  /**
   * Validate that a service name exists in docker-compose.yml.
   * Throws an error with helpful message if not found.
   */
  async validateService(serviceName: string): Promise<string> {
    await this.init();
    if (!this.services?.has(serviceName)) {
      const available = [...(this.services?.keys() ?? [])].join(', ');
      throw new Error(
        `Unknown service '${serviceName}'. Available services: ${available || 'none'}`,
      );
    }

    return serviceName;
  }

  /**
   * Validate multiple service names exist in docker-compose.yml.
   * Returns the validated service names array.
   */
  async validateServices(serviceNames: string[]): Promise<string[]> {
    await this.init();
    for (const name of serviceNames) {
      await this.validateService(name);
    }

    return serviceNames;
  }

  /**
   * Get all service names defined in docker-compose.yml.
   */
  async getServiceNames(): Promise<string[]> {
    await this.init();
    return [...(this.services?.keys() ?? [])];
  }

  async getContainer(
    serviceName: string,
    options: Partial<GetContainerOptions> = DefaultGetContainerOptions,
  ) {
    const getOptions = { ...DefaultGetContainerOptions, ...options };

    await this.loadContainers();

    const service = this.services?.get(serviceName);
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
    if (this.services && !force) {
      return;
    }

    const { stdout: servicesOutput } = await execa({
      cwd: this.monorepo.rootDir,
    })`docker compose config --services`;

    const services = servicesOutput
      .split('\n')
      .map((l) => l.trim())
      .reduce<ComposeServices>((services, name) => {
        services.set(name, { name, containers: [] });
        return services;
      }, new Map());

    const { stdout } = await execa({
      cwd: this.monorepo.rootDir,
    })`docker compose ps -a --format json`;

    if (!stdout.trim()) {
      this.services = services;
      return;
    }

    this.services = stdout
      .split('\n')
      .map((l) => JSON.parse(l))
      .reduce<ComposeServices>((services, entry) => {
        const svc = services.get(entry.Service);
        svc?.containers.push(entry);

        return services;
      }, services);
  }
}
