import { cwd } from 'node:process';
import { beforeEach, describe, expect, test } from 'vitest';

import { MonorepoConfig } from '../../../src/config/config';
import { CompleteExample } from '../../fixtures/complete-example';

describe.only('Config - MonorepoConfig', () => {
  let config: MonorepoConfig
  beforeEach(() => {
    config = new MonorepoConfig(CompleteExample)
  })

  test('it exposes its config', () => {
    const config = new MonorepoConfig({
      project: {
        name: 'test',
        rootDir: cwd()
      },
      components: [
        {
          name: 'frontend'
        },
        {
          name: 'backend',
          target: 'production',
          buildArgs: {
            API_KEY: 'secret'
          }
        }
      ]
    })

    expect(config.project.name).to.equal('test');
    expect(config.project.rootDir).to.equal(cwd());
    expect(config.components).toHaveLength(2)

    expect(config.components[0].name).to.equal('frontend')

    expect(config.components[1].name).to.equal('backend')
  })

  describe('#flavor(name)', () => {
    test('throws when flavour unknown', () => {
      expect(() => config.flavor('unknown')).to.throw(/Unknown flavor/)
    })

    test('returns the flavour config', () => {
      expect(config.flavor('production').components).toHaveLength(1);
    })
  });

  describe('#component(name)', () => {
    test('throws when component unknown', () => {
      expect(() => config.component('unknown')).to.throw(/Unknown component/)
    })

    test('returns the component config', () => {
      expect(config.component('frontend').name).to.equal('frontend');
    })
  });

  describe('#withFlavor(name)', () => {

    test('throws when flavour unknown', () => {
      expect(() => config.withFlavor('unknown')).to.throw(/Unknown flavor/)
    })

    test('returns a new config', () => {
      const newConfig = config.withFlavor('production');
      expect(newConfig).to.not.equal(config);
      expect(newConfig).to.be.an.instanceOf(MonorepoConfig)
    })

    test('uses the flavour overrides accordingly', () => {
      const production = config.withFlavor('production');

      // Untouched
      expect(production.project.name).to.equal(CompleteExample.project.name)
      expect(production.project.rootDir).to.equal(CompleteExample.project.rootDir)

      // Override per component
      expect(config.component('frontend').target).to.equal('development')
      expect(production.component('frontend').target).to.equal('production')

      // Override defaults
      expect(config.defaults.docker?.tag).to.equal('${vars:dockerTag}')
      expect(production.defaults.docker?.tag).to.equal('production')
    })
  })
});
