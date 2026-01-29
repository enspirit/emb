/**
 * Integration tests for Docker Compose services that are not EMB components.
 *
 * Uses the production-ready example which has:
 * - api and web components (auto-discovered via Dockerfiles)
 * - redis service (defined only in docker-compose.yml, no Dockerfile)
 *
 * These tests verify that EMB commands work correctly with services that
 * don't have corresponding EMB components (like redis which uses a pre-built image).
 */
import { runCommand } from '@oclif/test';
import { execa } from 'execa';
import { describe, expect, test } from 'vitest';

import { EXAMPLES, useExampleWithDocker } from '../../helpers.js';

describe('Docker Compose - services without components', () => {
  useExampleWithDocker('production-ready');

  // ==================== Service-only commands should work ====================

  test('emb logs works for a service that is not an EMB component', async () => {
    // Start redis first
    await execa('docker', ['compose', 'up', '-d', 'redis'], {
      cwd: EXAMPLES['production-ready'],
    });

    // emb logs should work with redis even though it's not an EMB component
    const { error } = await runCommand('logs --no-follow redis');

    expect(error).toBeUndefined();
  });

  test('emb up works for a service that is not an EMB component', async () => {
    // Redis has no component/resources to build, but up should still work
    const { error } = await runCommand('up redis');

    expect(error).toBeUndefined();

    // Verify redis is running
    const { stdout } = await execa(
      'docker',
      ['compose', 'ps', '--format=json'],
      {
        cwd: EXAMPLES['production-ready'],
      },
    );
    expect(stdout).toContain('redis');
  });

  test('emb stop works for a service that is not an EMB component', async () => {
    // Start redis first
    await execa('docker', ['compose', 'up', '-d', 'redis'], {
      cwd: EXAMPLES['production-ready'],
    });

    const { error } = await runCommand('stop redis');

    expect(error).toBeUndefined();
  });

  test('emb down works for a service that is not an EMB component', async () => {
    // Start redis first
    await execa('docker', ['compose', 'up', '-d', 'redis'], {
      cwd: EXAMPLES['production-ready'],
    });

    const { error } = await runCommand('down redis');

    expect(error).toBeUndefined();
  });

  // ==================== Error handling for unknown services ====================

  test('emb logs errors for non-existent service', async () => {
    const { error } = await runCommand('logs --no-follow nonexistent');

    expect(error).toBeDefined();
    expect(error?.message).toMatch(/nonexistent/i);
  });

  test('emb up errors for non-existent service', async () => {
    const { error } = await runCommand('up nonexistent');

    expect(error).toBeDefined();
    expect(error?.message).toMatch(/nonexistent/i);
  });

  // ==================== Mixed components and services ====================

  test('emb up works with both components and service-only services', async () => {
    // Start api (component) and redis (service-only) together
    const { error } = await runCommand('up api redis');

    expect(error).toBeUndefined();

    // Verify both are running
    const { stdout } = await execa(
      'docker',
      ['compose', 'ps', '--format=json'],
      {
        cwd: EXAMPLES['production-ready'],
      },
    );
    expect(stdout).toContain('api');
    expect(stdout).toContain('redis');
  });
});
