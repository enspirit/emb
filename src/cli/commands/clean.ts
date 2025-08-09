import { getContext } from '@';
import { Command } from '@oclif/core';
import { Listr } from 'listr2';

/**
 * For now, only cleans the stores (logs/sentinels)
 * But this should permit to clean everytning (via flags)
 *
 * Eg: --containers --volumes --images --networks
 * Or: --all
 */
export default class CleanCommand extends Command {
  static description = 'Clean the project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};

  public async run(): Promise<void> {
    const { monorepo } = getContext();

    const runner = new Listr([
      {
        rendererOptions: { persistentOutput: true },
        async task() {
          await monorepo.store.trash();
        },
        title: 'Cleaning project',
      },
    ]);

    await runner.run();
  }
}
