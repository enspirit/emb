import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough, Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { ExecuteLocalCommandOperation } from '../../../../../src/monorepo/operations/shell/ExecuteLocalCommandOperation.js';

describe('Monorepo / Operations / Shell / ExecuteLocalCommandOperation', () => {
  let tempDir: string;
  let outputBuffer: string[];
  let mockWritable: Writable;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embExecTest'));
    outputBuffer = [];
    mockWritable = new PassThrough();
    mockWritable.on('data', (chunk) => {
      outputBuffer.push(chunk.toString());
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('#run()', () => {
    test('it executes a script and returns output stream', async () => {
      const operation = new ExecuteLocalCommandOperation(mockWritable);

      const result = await operation.run({ script: 'echo "hello world"' });

      expect(result).toBeDefined();
      // Wait a bit for output
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      expect(outputBuffer.join('')).toContain('hello world');
    });

    test('it passes environment variables', async () => {
      const operation = new ExecuteLocalCommandOperation(mockWritable);

      await operation.run({
        script: 'echo $TEST_VAR',
        env: { TEST_VAR: 'test_value_123' },
      });

      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      expect(outputBuffer.join('')).toContain('test_value_123');
    });

    test('it uses workingDir as cwd', async () => {
      const operation = new ExecuteLocalCommandOperation(mockWritable);
      // Create a subdirectory
      const subDir = join(tempDir, 'subdir');
      await mkdir(subDir);

      await operation.run({
        script: 'pwd',
        workingDir: subDir,
      });

      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      expect(outputBuffer.join('')).toContain('subdir');
    });

    test('it runs non-interactive commands by default', async () => {
      const operation = new ExecuteLocalCommandOperation(mockWritable);

      // Non-interactive commands complete without waiting for input
      await operation.run({
        script: 'echo "test"',
        interactive: false,
      });

      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      expect(outputBuffer.join('')).toContain('test');
    });

    test('it pipes output to provided writable stream', async () => {
      const operation = new ExecuteLocalCommandOperation(mockWritable);

      await operation.run({ script: 'echo "piped output"' });

      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      expect(outputBuffer.length).toBeGreaterThan(0);
      expect(outputBuffer.join('')).toContain('piped output');
    });

    test('it handles multiple environment variables', async () => {
      const operation = new ExecuteLocalCommandOperation(mockWritable);

      await operation.run({
        script: 'echo "$VAR1 $VAR2"',
        env: { VAR1: 'first', VAR2: 'second' },
      });

      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      const output = outputBuffer.join('');
      expect(output).toContain('first');
      expect(output).toContain('second');
    });
  });
});
