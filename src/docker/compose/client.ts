import { Monorepo } from '@';
import { execa, ExecaError } from 'execa';

import { CliError } from '@/errors.js';

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

  async isService(component: string) {
    await this.init();
    return this.services?.has(component);
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

    let servicesOutput: string;
    try {
      const result = await execa({
        cwd: this.monorepo.rootDir,
      })`docker compose config --services`;
      servicesOutput = result.stdout;
    } catch (error) {
      if (error instanceof ExecaError) {
        const stderr =
          (error as ExecaError & { stderr?: string }).stderr?.trim() || '';
        if (stderr.includes('no configuration file provided')) {
          throw new CliError(
            'NO_COMPOSE_FILE',
            'No docker-compose.yml file found',
            [
              'Create a docker-compose.yml file in your project root',
              'Or use task commands instead: emb run <task>',
            ],
          );
        }

        throw new CliError('COMPOSE_CONFIG_ERR', stderr || error.shortMessage, [
          'Check that Docker is running and docker-compose is installed',
        ]);
      }

      throw error;
    }

    const services = servicesOutput
      .split('\n')
      .map((l) => l.trim())
      .reduce<ComposeServices>((services, name) => {
        services.set(name, { name, containers: [] });
        return services;
      }, new Map());

    let stdout: string;
    try {
      const result = await execa({
        cwd: this.monorepo.rootDir,
      })`docker compose ps -a --format json`;
      stdout = result.stdout;
    } catch (error) {
      if (error instanceof ExecaError) {
        const stderr =
          (error as ExecaError & { stderr?: string }).stderr?.trim() || '';
        throw new CliError('COMPOSE_PS_ERR', stderr || error.shortMessage, [
          'Check that Docker is running',
        ]);
      }

      throw error;
    }

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
