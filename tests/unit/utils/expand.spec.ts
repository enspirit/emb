/* eslint-disable no-template-curly-in-string */
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TemplateExpander } from '../../../src/utils/TemplateExpander.js';

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
      expandFn.mockReset();

      await expandFn('Test $NOTAVARIABLE', {});
      expect(expandFn).to.toHaveResolvedWith('Test $NOTAVARIABLE');
      expandFn.mockReset();

      await expandFn('Test ${INCOMPLETE', {});
      expect(expandFn).to.toHaveResolvedWith('Test ${INCOMPLETE');
      expandFn.mockReset();
    });

    test('supports escaping', async () => {
      await expandFn('Test \\${ESCAPED}', {});
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
    });
  });
});
