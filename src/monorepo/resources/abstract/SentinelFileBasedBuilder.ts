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
   * Whether the artifact produced by the previous successful build still exists
   * out-of-band (e.g. a docker image that may have been pruned). Defaults to
   * true — most builders have no external artifact to verify. Overrides must
   * NOT reject: the caller treats any failure as "absent" (i.e. rebuild).
   */
  protected async artifactExists(_resource: ResourceInfo<I>): Promise<boolean> {
    return true;
  }

  /**
   * Checks whether the resource must be (re)built: true when there is no prior
   * sentinel, when the sources are newer than the last build, or when the
   * previously-built artifact no longer exists.
   */
  async mustBuild(
    resource: ResourceInfo<I>,
  ): Promise<SentinelData | undefined> {
    if (!this._mustBuild) {
      return;
    }

    // Probe artifact existence up front so the check (e.g. a docker inspect)
    // overlaps the sentinel read + rebuild-strategy computation instead of
    // adding to the critical path. .catch keeps a rejected or (on a rebuild
    // path) unconsumed probe from becoming an unhandled rejection and treats a
    // failed probe as "absent", i.e. rebuild.
    const artifactPresent = this.artifactExists(resource).catch(() => false);

    const [lastSentinelFile, newSentinelData] = await Promise.all([
      this.readSentinel(),
      this._mustBuild(resource),
    ]);
    this.lastSentinelFile = lastSentinelFile;
    this.newSentinelData = newSentinelData;

    if (!(lastSentinelFile && newSentinelData)) {
      return newSentinelData;
    }

    if (lastSentinelFile.mtime < newSentinelData.mtime) {
      return newSentinelData;
    }

    // Sentinel is fresh, but the built artifact may have been removed
    // out-of-band (e.g. `docker system prune`); force a rebuild if it is gone.
    if (!(await artifactPresent)) {
      return newSentinelData;
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
