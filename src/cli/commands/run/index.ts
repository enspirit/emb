import { Args, Command } from '@oclif/core';
import { Listr } from 'listr2';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { Readable } from 'node:stream';

import { getContext } from '@/cli';

export default class RunComponentScript extends Command {
  static args = {
    component: Args.string({
      description: 'Component name',
      required: true,
    }),
    script: Args.string({ description: 'NPM script to run', required: true }),
  };
  static description = "Run an npm script from a component's package.json";
  static strict = true;

  async run() {
    const { args } = await this.parse(RunComponentScript);
    const { monorepo } = getContext();

    const component = monorepo.component(args.component);
    const pkgPath = component.join('package.json');
    const tasks = new Listr(
      [
        {
          rendererOptions: {
            persistentOutput: true,
          },
          async task(_ctx, _task): Promise<Readable | undefined> {
            try {
              const pkgRaw = await fs.readFile(pkgPath, 'utf8');
              const pkg = JSON.parse(pkgRaw);

              if (!pkg.scripts?.[args.script]) {
                throw new Error(
                  `Script "${args.script}" not found in ${component.name}/package.json`,
                );
              }

              return spawn('npm', ['run', args.script], {
                cwd: component.rootdir,
              }).stdout;
            } catch (error) {
              const error_ =
                error instanceof Error
                  ? new TypeError(
                      `Failed to run ${component.name}:${args.script}\n${error.message}`,
                    )
                  : new Error(
                      `Failed to run ${component.name}:${args.script}\n${error as string}`,
                    );
              throw error_;
            }
          },
          title: `Running npm script '${args.script}' on ${args.component}`,
        },
      ],
      { concurrent: false },
    );

    try {
      await tasks.run();
    } catch (error) {
      console.error(error);
    }
  }
}
