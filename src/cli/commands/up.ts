import { Flags } from '@oclif/core';
import { Listr } from 'listr2';

import { FlavoredCommand, getContext } from '@/cli';
import { up } from '@/docker';

export default class UpCommand extends FlavoredCommand<typeof UpCommand> {
  static description = 'Start the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    'force-recreate': Flags.boolean({
      char: 'f',
      default: false,
      description:
        "Recreate containers even if their configuration and image haven't changed",
      name: 'force-recreate',
    }),
  };

  public async run(): Promise<void> {
    const { monorepo } = getContext();

    const runner = new Listr([
      {
        rendererOptions: { persistentOutput: true },
        async task(ctx, task) {
          const process = await up({ cwd: monorepo.rootDir });

          const handleOutput = (chunk: Buffer) => {
            const line = chunk.toString();
            task.output = line.trimEnd(); // This updates the live output in Listr
          };

          process.stdout?.on('data', handleOutput);
          process.stderr?.on('data', handleOutput);

          return new Promise((resolve, reject) => {
            process.on('exit', (code) => {
              if (code === 0) {
                resolve(null);
              } else {
                reject(new Error(`Command failed with code ${code}`));
              }
            });

            process.on('error', (err) => {
              reject(err);
            });
          });
        },
        title: 'Starting project',
      },
    ]);

    await runner.run();
  }
}
