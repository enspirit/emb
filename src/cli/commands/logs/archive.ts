import { Args, Flags } from '@oclif/core';

import { BaseCommand, getContext } from '@/cli';
import { ComposeLogsArchiveOperation } from '@/docker';

export default class LogsArchive extends BaseCommand {
  static description =
    'Archive docker compose logs to files (one file per component).';
  static enableJsonFlag = true;
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> backend frontend',
    '<%= config.bin %> <%= command.id %> --timestamps',
    '<%= config.bin %> <%= command.id %> --tail 1000',
  ];
  static strict = false;
  static flags = {
    timestamps: Flags.boolean({
      char: 't',
      description: 'Include timestamps in logs',
      default: false,
    }),
    tail: Flags.integer({
      description: 'Number of lines to show from the end of the logs',
    }),
    output: Flags.string({
      char: 'o',
      description:
        'Output directory for log files (defaults to .emb/<flavor>/logs/docker/compose)',
    }),
  };
  static args = {
    component: Args.string({
      name: 'component',
      description: 'The component(s) to archive logs for (all if omitted)',
      required: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags, argv } = await this.parse(LogsArchive);
    const { monorepo } = await getContext();

    const componentNames = argv as string[];

    // Validate that all specified components exist
    if (componentNames.length > 0) {
      componentNames.forEach((name) => monorepo.component(name));
    }

    const result = await monorepo.run(new ComposeLogsArchiveOperation(), {
      components: componentNames.length > 0 ? componentNames : undefined,
      outputDir: flags.output,
      timestamps: flags.timestamps,
      tail: flags.tail,
    });

    if (this.jsonEnabled()) {
      this.log(JSON.stringify(result, null, 2));
    } else {
      this.log('Archived logs:');
      for (const file of result) {
        this.log(`  ${file.component}: ${file.path}`);
      }
    }
  }
}
