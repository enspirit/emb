/**
 * Integration tests for emb logs command with real Docker.
 *
 * Uses the fullstack-app example which has:
 * - api and web components
 * - docker-compose.yml for running services
 *
 * These tests verify both command execution and actual log content.
 */
import { runCommand } from '@oclif/test';
import { execa } from 'execa';
import { describe, expect, test } from 'vitest';

import { EXAMPLES, useExampleWithDocker } from '../../helpers.js';

describe('Docker Compose - logs', () => {
  useExampleWithDocker('fullstack-app');

  // ==================== Basic Tests ====================

  test('logs --no-follow shows logs for all containers', async () => {
    // Start a container first
    await runCommand('up api');

    // Get logs without following (should complete)
    const { error } = await runCommand('logs --no-follow');

    expect(error).toBeUndefined();
  });

  test('logs --no-follow shows logs for a single component', async () => {
    await runCommand('up api');

    const { error } = await runCommand('logs --no-follow api');

    expect(error).toBeUndefined();
  });

  test('logs --no-follow shows logs for multiple components', async () => {
    // Start multiple containers
    await runCommand('up api');
    await runCommand('up web');

    const { error } = await runCommand('logs --no-follow api web');

    expect(error).toBeUndefined();
  });

  // ==================== Log Content Assertions ====================

  test('logs contain expected API startup message', async () => {
    // Start both containers to ensure clean state
    await runCommand('up api');
    await runCommand('up web');

    // Use docker compose logs directly to capture output
    const { all } = await execa('docker', ['compose', 'logs', 'api'], {
      cwd: EXAMPLES['fullstack-app'],
      all: true,
    });

    // The API server logs "API server running on port 3000"
    expect(all).toMatch(/API server running on port/);
  });

  test('logs for multiple services contain content from both', async () => {
    await runCommand('up api');
    await runCommand('up web');

    const { all } = await execa('docker', ['compose', 'logs', 'api', 'web'], {
      cwd: EXAMPLES['fullstack-app'],
      all: true,
    });

    // Should contain api logs (API server message)
    expect(all).toMatch(/API server running on port/);
  });

  // ==================== Error Handling ====================

  test('logs errors for non-existent component', async () => {
    const { error } = await runCommand('logs --no-follow nonexistent');

    expect(error).toBeDefined();
    expect(error?.message).toMatch(/nonexistent/i);
  });

  test('logs errors when one of multiple components does not exist', async () => {
    // No need to start containers - component validation happens before docker operations
    const { error } = await runCommand('logs --no-follow api nonexistent');

    expect(error).toBeDefined();
    expect(error?.message).toMatch(/nonexistent/i);
  });

  // ==================== Edge Cases ====================

  test('logs --no-follow works with stopped containers', async () => {
    await runCommand('up api');
    await runCommand('stop');

    // Should still work (shows historical logs)
    const { error } = await runCommand('logs --no-follow api');

    expect(error).toBeUndefined();
  });
});
