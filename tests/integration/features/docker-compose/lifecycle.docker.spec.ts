/**
 * Integration tests for docker-compose lifecycle with real Docker.
 *
 * Uses the fullstack-app example which has:
 * - api and web components
 * - docker-compose.yml for running services
 */
import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

import { useExampleWithDocker } from '../../helpers.js';

describe('Docker Compose - lifecycle', () => {
  useExampleWithDocker('fullstack-app');

  test('builds and starts a component with up', async () => {
    const { error } = await runCommand('up api');

    expect(error).toBeUndefined();

    // Verify it's running
    const { stdout } = await runCommand('ps');
    expect(stdout).toMatch(/api/);
  });

  test('stops containers with down', async () => {
    // Start first
    await runCommand('up api');

    // Then stop
    const { error } = await runCommand('down');
    expect(error).toBeUndefined();

    // Verify stopped
    const { stdout } = await runCommand('ps');
    expect(stdout).not.toMatch(/running/i);
  });

  test('shows container status with ps', async () => {
    await runCommand('up api');

    const { stdout, error } = await runCommand('ps');

    expect(error).toBeUndefined();
    expect(stdout).toContain('api');
  });

  test('up is idempotent', async () => {
    // Start twice should not error
    await runCommand('up api');
    const { error } = await runCommand('up api');

    expect(error).toBeUndefined();
  });

  // ==================== Start/Stop Tests ====================

  test('stop halts running containers without removing them', async () => {
    await runCommand('up api');

    // Stop
    const { error } = await runCommand('stop');
    expect(error).toBeUndefined();

    // Container should exist but be stopped (visible with --all)
    const { stdout } = await runCommand('ps --all');
    expect(stdout).toMatch(/api/);
  });

  test('start resumes stopped containers', async () => {
    await runCommand('up api');
    await runCommand('stop');

    // Start again
    const { error } = await runCommand('start api');
    expect(error).toBeUndefined();

    // Should be running
    const { stdout } = await runCommand('ps');
    expect(stdout).toMatch(/api/);
  });

  test('stop is idempotent', async () => {
    await runCommand('up api');

    // Stop twice should not error
    await runCommand('stop');
    const { error } = await runCommand('stop');
    expect(error).toBeUndefined();
  });

  // ==================== Restart Tests ====================

  test('restart recreates containers', async () => {
    await runCommand('up api');

    // Restart
    const { error } = await runCommand('restart api');
    expect(error).toBeUndefined();

    // Container should be running
    const { stdout } = await runCommand('ps');
    expect(stdout).toMatch(/api/);
  });

  test('restart works on stopped containers', async () => {
    await runCommand('up api');
    await runCommand('stop');

    // Restart from stopped state
    const { error } = await runCommand('restart api');
    expect(error).toBeUndefined();

    // Should be running again
    const { stdout } = await runCommand('ps');
    expect(stdout).toMatch(/api/);
  });

  test('restart with --no-deps flag', async () => {
    await runCommand('up api');

    // Restart without dependencies
    const { error } = await runCommand('restart api --no-deps');
    expect(error).toBeUndefined();

    // Should be running
    const { stdout } = await runCommand('ps');
    expect(stdout).toMatch(/api/);
  });

  // ==================== PS Tests ====================

  test('ps --all shows stopped containers', async () => {
    await runCommand('up api');
    await runCommand('stop');

    // Without --all should not show stopped
    const { stdout: withoutAll } = await runCommand('ps');
    expect(withoutAll).not.toMatch(/api.*running/i);

    // With --all should show
    const { stdout: withAll } = await runCommand('ps --all');
    expect(withAll).toMatch(/api/);
  });
});
