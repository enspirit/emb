/* eslint-disable no-template-curly-in-string */
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TemplateExpander } from '@/utils';

describe('TemplateExpander', () => {
  let expander: TemplateExpander;

  beforeEach(() => {
    expander = new TemplateExpander();
  });

  describe('Utils / expand', () => {
    const expandFn = vi.fn((str, opts) => expander.expand(str, opts));

    test('does not expand when unnecessary', async () => {
      await expandFn('Test', {});
      expect(expandFn).to.toHaveResolvedWith('Test');
      expect(expander.expansionCount).to.equal(0);
      expandFn.mockReset();

      await expandFn('Test $NOTAVARIABLE', {});
      expect(expandFn).to.toHaveResolvedWith('Test $NOTAVARIABLE');
      expect(expander.expansionCount).to.equal(0);
      expandFn.mockReset();

      await expandFn('Test ${INCOMPLETE', {});
      expect(expandFn).to.toHaveResolvedWith('Test ${INCOMPLETE');
      expect(expander.expansionCount).to.equal(0);
      expandFn.mockReset();
    });

    test('supports escaping', async () => {
      await expandFn('Test \\${ESCAPED}', {});
      expect(expander.expansionCount).to.equal(0);
      expect(expandFn).to.toHaveResolvedWith('Test ${ESCAPED}');
      expandFn.mockReset();
    });

    test('supports default sources', async () => {
      const options = {
        default: 'env',
        sources: {
          env: {
            LONG_VAR_NAME: 84,
            VAR: 42,
          },
        },
      };

      await expandFn('Test ${VAR}', options);
      expect(expandFn).to.toHaveResolvedWith('Test 42');
      expandFn.mockReset();

      await expandFn('Test ${LONG_VAR_NAME}', options);
      expect(expandFn).to.toHaveResolvedWith('Test 84');
      expandFn.mockReset();

      expect(expander.expansionCount).to.equal(2);
    });

    test('supports explicit source', async () => {
      const options = {
        sources: {
          env: {
            LONG_VAR_NAME: 84,
            VAR: 42,
          },
        },
      };

      await expandFn('Test ${env:VAR}', options);
      expect(expandFn).to.toHaveResolvedWith('Test 42');
      expandFn.mockReset();

      await expandFn('Test ${env:LONG_VAR_NAME}', options);
      expect(expandFn).to.toHaveResolvedWith('Test 84');
      expandFn.mockReset();

      expect(expander.expansionCount).to.equal(2);
    });

    test('supports default values', async () => {
      // Without source
      await expandFn('Test ${VAR:-default}', {});
      expect(expandFn).to.toHaveResolvedWith('Test default');
      expandFn.mockReset();

      // With source
      await expandFn('Test ${env:VAR:-otherDefault}', {
        sources: {
          env: {},
        },
      });
      expect(expandFn).to.toHaveResolvedWith('Test otherDefault');
      expandFn.mockReset();

      expect(expander.expansionCount).to.equal(2);
    });

    test('supports empty default values', async () => {
      // Without source
      await expandFn('Test ${VAR:-}', {});
      expect(expandFn).to.toHaveResolvedWith('Test ');
      expandFn.mockReset();

      // With source
      await expandFn('Test ${env:VAR:-}', {
        sources: {
          env: {},
        },
      });
      expect(expandFn).to.toHaveResolvedWith('Test ');
      expandFn.mockReset();

      expect(expander.expansionCount).to.equal(2);
    });

    test('supports async sources (functions)', async () => {
      const asyncSource = vi.fn(async (key: string) => {
        if (key === 'password') {
          return 'secret123';
        }

        if (key === 'username') {
          return 'testuser';
        }

        throw new Error(`Unknown key: ${key}`);
      });

      const options = {
        sources: {
          vault: asyncSource,
        },
      };

      const result = await expander.expand(
        'Password: ${vault:password}',
        options,
      );
      expect(result).to.equal('Password: secret123');
      expect(asyncSource).toHaveBeenCalledWith('password');
    });

    test('supports mixed sync and async sources', async () => {
      const asyncSource = vi.fn(async (key: string) => {
        if (key === 'secret') {
          return 'vault-secret';
        }

        throw new Error(`Unknown key: ${key}`);
      });

      const options = {
        default: 'env',
        sources: {
          env: { HOME: '/home/user' },
          vault: asyncSource,
        },
      };

      const result = await expander.expand(
        'Home: ${env:HOME}, Secret: ${vault:secret}',
        options,
      );
      expect(result).to.equal('Home: /home/user, Secret: vault-secret');
    });

    test('falls back to default when async source throws', async () => {
      const asyncSource = vi.fn(async () => {
        throw new Error('Connection failed');
      });

      const options = {
        sources: {
          vault: asyncSource,
        },
      };

      const result = await expander.expand(
        'Password: ${vault:password:-fallback}',
        options,
      );
      expect(result).to.equal('Password: fallback');
    });

    test('throws error when async source fails without default', async () => {
      const asyncSource = vi.fn(async () => {
        throw new Error('Connection failed');
      });

      const options = {
        sources: {
          vault: asyncSource,
        },
      };

      await expect(
        expander.expand('Password: ${vault:password}', options),
      ).rejects.toThrow('Connection failed');
    });
  });
});
