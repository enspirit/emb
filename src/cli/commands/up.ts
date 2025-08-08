import { Command, Flags } from '@oclif/core';
import { Listr } from 'listr2';

import { up } from '../../docker/compose/index.js';
import { getContext } from '../context.js';

export default class UpCommand extends Command {
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
          const process = up({ cwd: monorepo.rootDir });

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
