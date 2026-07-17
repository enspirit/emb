import { constants, createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';

import { Monorepo } from '@/monorepo';

/**
 * A first implementation of a "store" where
 * everyone can create things (logs, sentinel files, ...)
 *
 * For now it's a hidden folder on the root of the monorepo
 */
export class EMBStore {
  private path: string;

  constructor(
    private monorepo: Monorepo,
    dirname?: string,
  ) {
    // By default, we use the flavor name to build that root of the store
    // so that logs and sentinel files for different flavors are keps separate
    this.path = this.monorepo.join(dirname || '.emb');
  }

  async createReadStream(path: string) {
    await this.mkdirp(dirname(path));

    return createReadStream(this.join(path));
  }

  async createWriteStream(path: string, flags: string | undefined = 'w') {
    await this.mkdirp(dirname(path));

    return createWriteStream(this.join(path), {
      flags: flags ?? 'w',
    });
  }

  async init() {
    let exists: boolean;
    try {
      await access(this.path, constants.F_OK);
      exists = true;
    } catch {
      exists = false;
    }

    if (exists) {
      return;
    }

    try {
      await mkdir(this.path, { recursive: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : error;
      throw new Error(`Unable to create the emb store: ${msg}`);
    }
  }

  join(path: string) {
    // Confine every path to the per-flavor store directory: anchoring at '/'
    // and normalizing collapses any leading/interspersed '..' segments so they
    // cannot climb above the flavor root. This must live here (not just in
    // mkdirp) because writeFile/readFile/stat/streams all build their target
    // through join() — otherwise mkdirp and the actual file op disagree and a
    // '..' path escapes the sandbox (or ENOENTs on a mismatched parent).
    const confined = normalize(join('/', path));
    return join(this.path, this.monorepo.currentFlavor, confined);
  }

  async mkdirp(path: string) {
    await mkdir(this.join(path), { recursive: true });
  }

  async stat(path: string, mustExist = true) {
    try {
      return await stat(this.join(path));
    } catch (error) {
      if ((error as { code: string }).code === 'ENOENT' && !mustExist) {
        return;
      }

      throw error;
    }
  }

  async readFile(path: string, mustExist = true) {
    try {
      return (await readFile(this.join(path))).toString();
    } catch (error) {
      if ((error as { code: string }).code === 'ENOENT' && !mustExist) {
        return;
      }

      throw error;
    }
  }

  async trash() {
    return rm(this.path, { force: true, recursive: true });
  }

  async writeFile(path: string, data: string) {
    await this.mkdirp(dirname(path));

    return writeFile(this.join(path), data);
  }
}
