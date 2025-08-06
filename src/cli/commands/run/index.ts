import { Args, Command } from '@oclif/core';
import fs from 'node:fs/promises';
import path from 'node:path';

const componentsList: Array<string> = [];

export default class RunComponentScript extends Command {
  static args = {
    component: Args.string({
      description: 'Component name',
      options: componentsList,
      required: true,
    }),
    script: Args.string({ description: 'NPM script to run', required: true }),
  };
  static description = 'Run an npm script from a component’s package.json';
  static strict = false;

  async init() {
    console.log('INITNINTI ');
  }

  async run() {
    const { args } = await this.parse(RunComponentScript);
    const { component, script } = args;

    const componentPath = path.resolve(component);
    const pkgPath = path.join(componentPath, 'package.json');

    try {
      const pkgRaw = await fs.readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(pkgRaw);

      if (!pkg.scripts?.[script]) {
        this.error(`Script "${script}" not found in ${component}/package.json`);
      }

      this.log(`▶ Running "${script}" in ${component}`);
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to run ${component}:${script}\n${error.message}`);
      } else {
        this.error(`Failed to run ${component}:${script}\n${error as string}`);
      }
    }
  }
}
