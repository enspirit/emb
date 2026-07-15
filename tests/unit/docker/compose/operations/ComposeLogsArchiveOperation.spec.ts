import { EventEmitter } from 'node:events';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { pipeProcessToLog } from '@/docker/compose/operations/ComposeLogsArchiveOperation.js';

// Minimal ChildProcess-like fake: an EventEmitter with stdout/stderr streams.
const makeFakeChild = () => {
  // eslint-disable-next-line unicorn/prefer-event-target
  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
  };
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  return child;
};

describe('Docker / Compose / pipeProcessToLog', () => {
  let dir: string;
  let logPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'embArchiveTest'));
    logPath = join(dir, 'api.log');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('resolves after flushing all output when the process closes with code 0', async () => {
    const child = makeFakeChild();
    const ws = createWriteStream(logPath);

    const done = pipeProcessToLog(child as never, ws, 'api');

    child.stdout.write('hello from api\n');
    child.stdout.end();
    child.emit('close', 0, null);

    await done;

    // Resolving only after the stream has flushed means the archived file is
    // complete, not racing the child 'exit'.
    const content = await readFile(logPath, 'utf8');
    expect(content).toContain('hello from api');
  });

  test('rejects when the process closes with a non-zero code', async () => {
    const child = makeFakeChild();
    const ws = createWriteStream(logPath);

    const done = pipeProcessToLog(child as never, ws, 'api');

    child.emit('close', 1, null);

    await expect(done).rejects.toThrow(/exited with code 1/);
  });

  test('rejects when the write stream errors', async () => {
    const child = makeFakeChild();
    const ws = createWriteStream(logPath);

    const done = pipeProcessToLog(child as never, ws, 'api');

    ws.emit('error', new Error('EACCES: permission denied'));

    await expect(done).rejects.toThrow(/EACCES/);
  });
});
