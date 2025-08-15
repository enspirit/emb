import { ResourceInfo } from '@';
import { Writable } from 'node:stream';

import { IOperation } from '@/operations/types.js';

import { AbstractResourceBuilder } from './AbstractResourceBuilder.js';

export type SentinelFile<T> = {
  // represents the timestamp of the last build
  mtime: number;
  // whatever the builder provided right before the previous successful build
  data?: T;
};

export abstract class SentinelFileBasedBuilder<
  I,
  O,
  SentinelData extends { mtime: number },
> extends AbstractResourceBuilder<I, O, SentinelData> {
  private lastSentinelFile?: SentinelFile<SentinelData> | undefined;
  private newSentinelData?: SentinelData | undefined;

  /**
   * Checks wether or not the sentinel file is more recent
   * that the output of the builder's sentinel data
   */
  async mustBuild(
    resource: ResourceInfo<I>,
  ): Promise<SentinelData | undefined> {
    if (!this._mustBuild) {
      return;
    }

    this.lastSentinelFile = await this.readSentinel();
    this.newSentinelData = await this._mustBuild(resource);

    if (!(this.lastSentinelFile && this.newSentinelData)) {
      return this.newSentinelData;
    }

    if (this.lastSentinelFile.mtime < this.newSentinelData.mtime) {
      return this.newSentinelData;
    }
  }

  async build(
    resource: ResourceInfo<I>,
    out?: Writable,
  ): Promise<{ input: I; operation: IOperation<I, O> }> {
    return this._build(resource, out);
  }

  private get sentinelFileName() {
    const { monorepo, config } = this.context;
    return `sentinels/flavors/${monorepo.currentFlavor}/${config.component}/${config.name}.built`;
  }

  private async storeSentinelData(data: unknown) {
    await this.context.monorepo.store.writeFile(
      this.sentinelFileName,
      JSON.stringify(data),
    );
  }

  private async readSentinel(): Promise<
    SentinelFile<SentinelData> | undefined
  > {
    const stats = await this.context.monorepo.store.stat(
      this.sentinelFileName,
      false,
    );
    if (!stats) {
      return undefined;
    }

    const data = await this.context.monorepo.store.readFile(
      this.sentinelFileName,
      false,
    );

    return {
      data: data ? JSON.parse(data) : data,
      mtime: stats.mtime.getTime(),
    };
  }

  async _commit(
    _resource: ResourceInfo<I>,
    _output: O,
    reason: SentinelData,
  ): Promise<void> {
    this.storeSentinelData(reason);
  }
}
