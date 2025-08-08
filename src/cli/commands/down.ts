import { Command } from '@oclif/core';
import { Listr } from 'listr2';

import { getContext } from '@/cli';
import { down } from '@/docker';

export default class DownCommand extends Command {
  static description = 'Stop the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};

  public async run(): Promise<void> {
    const { monorepo } = getContext();

    const runner = new Listr([
      {
        rendererOptions: { persistentOutput: true },
        async task(ctx, task) {
          const process = down({ cwd: monorepo.rootDir });

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
        title: 'Stopping project',
      },
    ]);

    await runner.run();
  }
}
