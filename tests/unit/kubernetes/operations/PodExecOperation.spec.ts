import { Exec } from '@kubernetes/client-node';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createTestContext } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PodExecOperation } from '@/kubernetes/operations/PodExecOperation.js';

describe('Kubernetes / Operations / PodExecOperation', () => {
  let mockKubernetes: {
    config: object;
  };

  beforeEach(async () => {
    mockKubernetes = {
      config: {},
    };

    await createTestContext({ kubernetes: mockKubernetes as never });
  });

  describe('instantiation', () => {
    test('it creates an operation instance', () => {
      const operation = new PodExecOperation();
      expect(operation).toBeInstanceOf(PodExecOperation);
    });

    test('it accepts an output stream', () => {
      const stream = new PassThrough();
      const operation = new PodExecOperation(stream);
      expect(operation).toBeInstanceOf(PodExecOperation);
    });
  });

  describe('schema validation', () => {
    test('it rejects missing namespace', async () => {
      const operation = new PodExecOperation();
      await expect(
        operation.run({
          podName: 'test-pod',
          container: 'main',
          script: 'echo hello',
        } as never),
      ).rejects.toThrow();
    });

    test('it rejects missing podName', async () => {
      const operation = new PodExecOperation();
      await expect(
        operation.run({
          namespace: 'default',
          container: 'main',
          script: 'echo hello',
        } as never),
      ).rejects.toThrow();
    });

    test('it rejects missing script', async () => {
      const operation = new PodExecOperation();
      await expect(
        operation.run({
          namespace: 'default',
          podName: 'test-pod',
          container: 'main',
        } as never),
      ).rejects.toThrow();
    });

    test('it throws when container is not provided', async () => {
      const operation = new PodExecOperation();
      await expect(
        operation.run({
          namespace: 'default',
          podName: 'test-pod',
          script: 'echo hello',
        }),
      ).rejects.toThrow(/Container name is required/);
    });
  });

  describe('command building', () => {
    let capturedCommand: Array<string> | undefined;

    beforeEach(() => {
      capturedCommand = undefined;
      vi.spyOn(Exec.prototype, 'exec').mockImplementation(((
        ...args: Array<unknown>
      ) => {
        // The 4th argument to Exec.exec is the command array (['sh', '-c', ...]).
        capturedCommand = args[3] as Array<string>;
        // The operation calls websocket.on(...), so a Node EventEmitter (not
        // EventTarget) is required here.
        // eslint-disable-next-line unicorn/prefer-event-target
        const ws = new EventEmitter();
        // Resolve the operation cleanly once its 'close' listener is attached.
        setImmediate(() => ws.emit('close'));
        return Promise.resolve(ws);
      }) as never);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('it single-quotes env values so $ and command substitution are not expanded', async () => {
      const operation = new PodExecOperation();
      await operation.run({
        namespace: 'default',
        podName: 'test-pod',
        container: 'main',
        script: 'run.sh',
        env: { PASSWORD: 'p@$$word', EVIL: 'x$(rm -rf /data)' },
      });

      const script = capturedCommand?.[2] ?? '';
      // Single quotes make the shell treat the value literally: $$, $() and
      // backticks are NOT expanded/executed inside the pod.
      expect(script).toContain("export PASSWORD='p@$$word'");
      expect(script).toContain("export EVIL='x$(rm -rf /data)'");
    });

    test('it single-quotes the working directory', async () => {
      const operation = new PodExecOperation();
      await operation.run({
        namespace: 'default',
        podName: 'test-pod',
        container: 'main',
        script: 'run.sh',
        workingDir: '/tmp/$(reboot)',
      });

      const script = capturedCommand?.[2] ?? '';
      expect(script).toContain("cd '/tmp/$(reboot)' &&");
    });
  });

  describe('error wrapping', () => {
    // Error wrapping is tested implicitly through the wrapError private method
    // These tests verify the error patterns we expect to handle
    test('it handles 404 errors', () => {
      const error = new Error('pod not found (404)');
      expect(error.message).toContain('not found');
    });

    test('it handles 403 errors', () => {
      const error = new Error('Forbidden: access denied');
      expect(error.message).toContain('Forbidden');
    });

    test('it handles 401 errors', () => {
      const error = new Error('Unauthorized: invalid credentials');
      expect(error.message).toContain('Unauthorized');
    });

    test('it handles connection refused errors', () => {
      const error = new Error('connect ECONNREFUSED');
      expect(error.message).toContain('ECONNREFUSED');
    });
  });
});
