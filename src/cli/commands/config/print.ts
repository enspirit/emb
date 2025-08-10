import YAML from 'yaml';

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

  public async run(): Promise<IMonorepoConfig> {
    const { flags } = await this.parse(ConfigPrint);
    const context = await getContext();

    if (!flags.json) {
      this.log(YAML.stringify(context.monorepo.config));
    }

    return context.monorepo.config;
  }
}
