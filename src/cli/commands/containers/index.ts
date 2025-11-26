import { getContext } from '@';
import { Flags } from '@oclif/core';
import { printTable } from '@oclif/table';
import { ContainerInfo } from 'dockerode';

import { BaseCommand, TABLE_DEFAULTS } from '@/cli';
import { ListContainersOperation, shortId } from '@/docker';
import { timeAgo } from '@/utils';

export default class ContainersIndex extends BaseCommand {
  static description = 'List docker containers.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    all: Flags.boolean({
      char: 'a',
      default: false,
      description:
        'Retun all containers. By default, only running containers are shown',
      name: 'all',
      required: false,
    }),
  };

  public async run(): Promise<Array<ContainerInfo>> {
    const { flags } = await this.parse(ContainersIndex);
    const context = await getContext();

    const { monorepo } = context;

    const containers = await monorepo.run(new ListContainersOperation(), {
      all: flags.all,
      filters: {
        label: [`emb/project=${monorepo.name}`],
      },
    });

    if (!flags.json) {
      const data = containers.map((c) => {
        return {
          command: c.Command,
          created: timeAgo(new Date(c.Created * 1000)),
          id: shortId(c.Id),
          image: c.Image,
          name: c.Names[0] || c.Id,
          ports: c.Ports?.map((p) => {
            const parts = [];

            if (p.IP) {
              parts.push(p.IP, ':', p.PublicPort, '->');
            }

            parts.push(p.PrivatePort, '/', p.Type);

            return parts.join('');
          }).join(', '),
          status: c.Status,
        };
      });

      printTable({
        ...TABLE_DEFAULTS,
        columns: [
          'id',
          'image',
          'command',
          'created',
          'status',
          'ports',
          'name',
        ],
        data,
      });
    }

    return containers;
  }
}
