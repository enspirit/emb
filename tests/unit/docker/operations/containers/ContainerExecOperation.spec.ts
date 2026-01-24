import { EmbContext, getContext } from '@';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createTestContext } from 'tests/setup/set.context.js';
import { beforeEach, describe, expect, Mock, test, vi } from 'vitest';

import { ContainerExecOperation } from '@/docker';

describe('Docker / ContainerExecOperation', () => {
  let context: EmbContext;
  let getContainer: Mock;
  let mockContainer: {
    exec: Mock;
    modem: { demuxStream: Mock };
  };
  let mockExec: {
    start: Mock;
    inspect: Mock;
    modem: { demuxStream: Mock };
  };
  let mockStream: EventEmitter;

  beforeEach(async () => {
    await createTestContext();
    context = getContext();
    getContainer = context.docker.getContainer as Mock;

    // Create mock stream - EventEmitter is needed for Node.js stream mocking
    // eslint-disable-next-line unicorn/prefer-event-target
    mockStream = new EventEmitter();

    // Create mock exec object
    mockExec = {
      start: vi.fn().mockResolvedValue(mockStream),
      inspect: vi.fn((cb) => cb(null, { ExitCode: 0 })),
      modem: {
        demuxStream: vi.fn(),
      },
    };

    // Create mock container
    mockContainer = {
      exec: vi.fn().mockResolvedValue(mockExec),
      modem: {
        demuxStream: vi.fn(),
      },
    };

    getContainer.mockReturnValue(mockContainer);
  });

  describe('when running a simple command', () => {
    test('it executes the command in the container', async () => {
      const operation = new ContainerExecOperation();

      // Simulate successful execution
      setTimeout(() => {
        mockStream.emit('end');
      }, 10);

      await operation.run({
        container: 'test-container',
        script: 'echo hello',
      });

      expect(getContainer).toHaveBeenCalledWith('test-container');
      expect(mockContainer.exec).toHaveBeenCalledWith({
        AttachStderr: true,
        AttachStdout: true,
        AttachStdin: true,
        Cmd: ['bash', '-eu', '-o', 'pipefail', '-c', 'echo hello'],
        Env: [],
        Tty: false,
        WorkingDir: undefined,
      });
      expect(mockExec.start).toHaveBeenCalledWith({
        hijack: true,
        stdin: true,
      });
    });
  });

  describe('when running with environment variables', () => {
    test('it passes env vars to the container exec', async () => {
      const operation = new ContainerExecOperation();

      setTimeout(() => {
        mockStream.emit('end');
      }, 10);

      await operation.run({
        container: 'test-container',
        script: 'echo $FOO',
        env: { FOO: 'bar', BAZ: 'qux' },
      });

      expect(mockContainer.exec).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: ['FOO=bar', 'BAZ=qux'],
        }),
      );
    });
  });

  describe('when running with a working directory', () => {
    test('it sets the working directory', async () => {
      const operation = new ContainerExecOperation();

      setTimeout(() => {
        mockStream.emit('end');
      }, 10);

      await operation.run({
        container: 'test-container',
        script: 'pwd',
        workingDir: '/app',
      });

      expect(mockContainer.exec).toHaveBeenCalledWith(
        expect.objectContaining({
          WorkingDir: '/app',
        }),
      );
    });
  });

  describe('when running in interactive mode', () => {
    test('it sets TTY to true', async () => {
      const operation = new ContainerExecOperation();

      setTimeout(() => {
        mockStream.emit('end');
      }, 10);

      await operation.run({
        container: 'test-container',
        script: 'bash',
        interactive: true,
      });

      expect(mockContainer.exec).toHaveBeenCalledWith(
        expect.objectContaining({
          Tty: true,
        }),
      );
    });
  });

  describe('when running with TTY', () => {
    test('it sets TTY to true', async () => {
      const operation = new ContainerExecOperation();

      setTimeout(() => {
        mockStream.emit('end');
      }, 10);

      await operation.run({
        container: 'test-container',
        script: 'bash',
        tty: true,
      });

      expect(mockContainer.exec).toHaveBeenCalledWith(
        expect.objectContaining({
          Tty: true,
        }),
      );
    });
  });

  describe('when provided with an output stream', () => {
    test('it demuxes output to the stream', async () => {
      const output = new PassThrough();
      const operation = new ContainerExecOperation(output);

      setTimeout(() => {
        mockStream.emit('end');
      }, 10);

      await operation.run({
        container: 'test-container',
        script: 'echo test',
      });

      expect(mockExec.modem.demuxStream).toHaveBeenCalledWith(
        mockStream,
        output,
        output,
      );
    });
  });

  describe('when the command fails', () => {
    test('it rejects with an error for non-zero exit code', async () => {
      mockExec.inspect = vi.fn((cb) => cb(null, { ExitCode: 1 }));

      const operation = new ContainerExecOperation();

      setTimeout(() => {
        mockStream.emit('end');
      }, 10);

      await expect(
        operation.run({
          container: 'test-container',
          script: 'exit 1',
        }),
      ).rejects.toThrow('command failed (exit 1)');
    });

    test('it rejects when inspect returns an error', async () => {
      mockExec.inspect = vi.fn((cb) => cb(new Error('Inspect failed')));

      const operation = new ContainerExecOperation();

      setTimeout(() => {
        mockStream.emit('end');
      }, 10);

      await expect(
        operation.run({
          container: 'test-container',
          script: 'echo hello',
        }),
      ).rejects.toThrow('Inspect failed');
    });

    test('it rejects when the stream emits an error', async () => {
      const operation = new ContainerExecOperation();

      setTimeout(() => {
        mockStream.emit('error', new Error('Stream error'));
      }, 10);

      await expect(
        operation.run({
          container: 'test-container',
          script: 'echo hello',
        }),
      ).rejects.toThrow('Stream error');
    });
  });

  describe('when the stream emits close instead of end', () => {
    test('it handles the close event', async () => {
      const operation = new ContainerExecOperation();

      setTimeout(() => {
        mockStream.emit('close');
      }, 10);

      await operation.run({
        container: 'test-container',
        script: 'echo hello',
      });

      expect(mockExec.inspect).toHaveBeenCalled();
    });
  });
});
