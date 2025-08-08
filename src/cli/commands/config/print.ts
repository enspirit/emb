import { Command } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import { IMonorepoConfig } from '@/config';

export type TaskInfo = {
  component?: string;
  description?: string;
  name: string;
};

export default class ConfigPrint extends FlavoredCommand<typeof ConfigPrint> {
  static description = 'Print the current config.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};

  public async run(): Promise<IMonorepoConfig> {
    const { flags } = await this.parse(ConfigPrint);
    const context = await getContext();
    const { monorepo } = context;

    if (!flags.json) {
      console.log(JSON.stringify(monorepo.config, null, 2));
    }

    return monorepo.config;
  }
}
