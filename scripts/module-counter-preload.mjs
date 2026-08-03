/**
 * Instruments module loading, then reports on exit.
 *
 * Loaded via `node --import` (not `--require`): `Module.register()` needs the
 * ESM loader to be initialized, which it is not during a CJS preload.
 *
 * Counts both pipelines and deduplicates between them, since a CommonJS file
 * imported from ESM passes through both.
 */
import fs from 'node:fs';
import Module, { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MessageChannel } from 'node:worker_threads';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {Map<string, {bytes: number, kind: string}>} */
const modules = new Map();

const record = (file, bytes, kind) => {
  if (!modules.has(file)) {
    modules.set(file, { bytes, kind });
  }
};

// --- CommonJS --------------------------------------------------------------
const originalCompile = Module.prototype._compile;
Module.prototype._compile = function (content, filename) {
  record(filename, content.length, 'cjs');

  return originalCompile.call(this, content, filename);
};

// --- ESM -------------------------------------------------------------------
// Loader hooks run on their own thread; counts come back over a MessagePort.
const { port1, port2 } = new MessageChannel();

port1.on('message', ({ url, size }) => {
  if (url.startsWith('file:')) {
    record(fileURLToPath(url), size, 'esm');
  }
});
port1.unref(); // do not hold the process open

register(pathToFileURL(path.join(REPO_ROOT, 'scripts', 'module-counter-hook.mjs')).href, {
  data: { port: port2 },
  transferList: [port2],
});

// --- Report ----------------------------------------------------------------
const packageOf = (file) => {
  // Last node_modules segment, so nested installs are attributed to the package
  // actually being loaded rather than to its host.
  const marker = `node_modules${path.sep}`;
  const idx = file.lastIndexOf(marker);

  if (idx === -1) {
    return file.startsWith(REPO_ROOT) ? '(emb source)' : '(other)';
  }

  const parts = file.slice(idx + marker.length).split(path.sep);

  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
};

process.on('exit', () => {
  const byPackage = new Map();
  let totalBytes = 0;
  let cjs = 0;

  for (const [file, { bytes, kind }] of modules) {
    const key = packageOf(file);
    const entry = byPackage.get(key) ?? { files: 0, bytes: 0 };
    entry.files += 1;
    entry.bytes += bytes;
    byPackage.set(key, entry);

    totalBytes += bytes;
    if (kind === 'cjs') {
      cjs += 1;
    }
  }

  const lines = [
    '',
    '─'.repeat(64),
    `modules compiled : ${modules.size}  (${cjs} cjs, ${modules.size - cjs} esm)`,
    `source parsed    : ${(totalBytes / 1e6).toFixed(2)} MB`,
    '─'.repeat(64),
  ];

  for (const [name, { files, bytes }] of [...byPackage]
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .slice(0, 20)) {
    lines.push(
      `${String(files).padStart(5)} files ${(bytes / 1024).toFixed(0).padStart(8)} KB  ${name}`,
    );
  }

  // writeSync: process.stderr can already be torn down during 'exit'.
  fs.writeSync(2, lines.join('\n') + '\n');
});
