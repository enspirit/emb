/**
 * Integration tests for config print command.
 *
 * Uses the fullstack-app example to test the print functionality.
 * Flavor-specific tests are in flavors/config.spec.ts.
 */
import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';
import YAML from 'yaml';

import { useExample } from '../../helpers.js';

describe('Config - print', () => {
  useExample('fullstack-app');

  test('prints config in JSON format', async () => {
    const { stdout } = await runCommand('config print --json');

    const config = JSON.parse(stdout);

    expect(config.project.name).to.equal('fullstack-app');
    expect(Object.keys(config.components)).to.have.length(2);
    expect(config.components).to.have.property('api');
    expect(config.components).to.have.property('web');
  });

  test('prints config in YAML format (default)', async () => {
    const { stdout } = await runCommand('config print');

    const config = YAML.parse(stdout);

    expect(config.project.name).to.equal('fullstack-app');
    expect(Object.keys(config.components)).to.have.length(2);
  });

  test('includes environment variables', async () => {
    const { stdout } = await runCommand('config print --json');

    const config = JSON.parse(stdout);

    expect(config.env).to.have.property('DOCKER_TAG');
    expect(config.env).to.have.property('NODE_ENV');
  });

  test('includes project-level tasks', async () => {
    const { stdout } = await runCommand('config print --json');

    const config = JSON.parse(stdout);

    expect(config.tasks).to.have.property('setup');
    expect(config.tasks).to.have.property('deps');
    expect(config.tasks).to.have.property('build');
  });

  test('includes plugins configuration', async () => {
    const { stdout } = await runCommand('config print --json');

    const config = JSON.parse(stdout);

    expect(config.plugins).to.be.an('array');
    expect(config.plugins.length).to.be.greaterThan(0);
  });
});
