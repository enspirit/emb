import { constants, createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
    dirname = '.emb',
  ) {
    this.path = this.monorepo.join(dirname);
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
    return join(this.path, path);
  }

  async mkdirp(path: string) {
    // Avoid getting out of the store by ensuring nothing goes past ../
    const normalized = normalize(join('/', path));
    await mkdir(this.join(normalized), { recursive: true });
  }

  async readFile(path: string) {
    return readFile(this.join(path));
  }

  async trash() {
    return rm(this.path, { force: true, recursive: true });
  }

  async writeFile(path: string, data: string) {
    await this.mkdirp(dirname(path));

    return writeFile(this.join(path), data);
  }
}
