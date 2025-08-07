import { Args, Command } from '@oclif/core';
import fs from 'node:fs/promises';
import path from 'node:path';

import { getContext } from '../../context.js';

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

    try {
      const pkgRaw = await fs.readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(pkgRaw);

      if (!pkg.scripts?.[args.script]) {
        this.error(
          `Script "${args.script}" not found in ${component.name}/package.json`,
        );
      }

      this.log(`▶ Running "${args.script}" in ${component.name}`);
    } catch (error) {
      if (error instanceof Error) {
        this.error(
          `Failed to run ${component.name}:${args.script}\n${error.message}`,
        );
      } else {
        this.error(
          `Failed to run ${component.name}:${args.script}\n${error as string}`,
        );
      }
    }
  }
}
