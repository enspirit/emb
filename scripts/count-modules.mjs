#!/usr/bin/env node
/**
 * Counts the JavaScript modules an `emb` invocation has to compile, and how
 * many bytes of source that represents, grouped by package.
 *
 * Startup cost is dominated by module loading, and module counts are stable
 * across machines in a way wall-clock timing is not — which makes them the
 * right signal for catching startup regressions.
 *
 * Usage:
 *   scripts/count-modules.mjs --version
 *   scripts/count-modules.mjs ps
 *   scripts/count-modules.mjs ps --cwd ~/Work/klaro/klaro
 *
 * Runs against dist/, so run `npm run build` first.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// See the equivalent note in bench-startup.mjs. Without a manifest, oclif loads
// every command module at startup, which inflates the count for every command.
if (!existsSync(path.join(REPO_ROOT, 'oclif.manifest.json'))) {
  console.error(
    '\n  WARNING: oclif.manifest.json is missing, so this count is inflated\n' +
      '  relative to the published package. Run `npx oclif manifest` first.\n',
  );
}

const argv = process.argv.slice(2);
const cwdIndex = argv.indexOf('--cwd');
const cwd = cwdIndex === -1 ? process.cwd() : argv[cwdIndex + 1];
const args = cwdIndex === -1 ? argv : [...argv.slice(0, cwdIndex), ...argv.slice(cwdIndex + 2)];

const { status } = spawnSync(
  process.execPath,
  [
    '--import',
    path.join(REPO_ROOT, 'scripts', 'module-counter-preload.mjs'),
    path.join(REPO_ROOT, 'bin', 'run.js'),
    ...args,
  ],
  { stdio: 'inherit', cwd },
);

process.exit(status ?? 1);
