import { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';
import pMap from 'p-map';

import { Component } from '@/monorepo';

import {
  FilePrerequisite,
  PrerequisitePlugin,
  PrerequisiteType,
} from './types.js';

export class FilePrerequisitePlugin implements PrerequisitePlugin<
  PrerequisiteType.file,
  FilePrerequisite,
  string
> {
  async diff(
    component: Component,
    prerequisites: Array<FilePrerequisite>,
    previous: string,
    _actual: string,
  ): Promise<Array<FilePrerequisite> | null> {
    const stats = await this.getStats(component, prerequisites);

    const changes = stats
      .filter((s) => {
        return s.mtimeMs > Number.parseInt(previous, 10);
      })
      .map((s) => ({
        path: s.path,
        type: s.type,
      }));

    return changes.length > 0 ? changes : null;
  }

  async meta(
    component: Component,
    prerequisites: FilePrerequisite[],
    mode: 'post' | 'pre',
  ): Promise<string> {
    switch (mode) {
      case 'post': {
        return Date.now().toString();
      }

      case 'pre': {
        const stats = await this.getStats(component, prerequisites);

        const max = stats.reduce((minimum, stat) => {
          return Math.max(minimum, stat.mtimeMs);
        }, 0);

        return max.toFixed(0).toString();
      }

      default: {
        throw new Error(`Invalid mode passed to 'meta()': ${mode}`);
      }
    }
  }

  private async getStats(
    component: Component,
    prerequisites: Array<FilePrerequisite>,
  ): Promise<Array<FilePrerequisite & Stats>> {
    return pMap(
      prerequisites,
      async (file) => {
        return {
          ...file,
          ...(await stat(component.join(file.path))),
        };
      },
      { concurrency: 30 },
    );
  }
}
