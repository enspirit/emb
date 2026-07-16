import { describe, expect, test, vi } from 'vitest';

import { TemplateExpander } from '@/utils';
import type { Expandable } from '@/utils/TemplateExpander.js';

describe('Utils / expandRecord', () => {
  const expander = new TemplateExpander();
  const expandRecordFn = vi.fn((record, opts) =>
    expander.expandRecord(record, opts),
  );

  describe('non-string primitive values (non-regression)', () => {
    const options = { sources: { env: {} } };

    test('returns numbers unchanged', async () => {
      expect(
        await expander.expandRecord(8080 as unknown as Expandable, options),
      ).to.equal(8080);
    });

    test('returns booleans unchanged', async () => {
      expect(
        await expander.expandRecord(true as unknown as Expandable, options),
      ).to.equal(true);
      expect(
        await expander.expandRecord(false as unknown as Expandable, options),
      ).to.equal(false);
    });

    test('returns null unchanged instead of throwing', async () => {
      expect(
        await expander.expandRecord(null as unknown as Expandable, options),
      ).to.equal(null);
    });

    test('preserves non-string values nested in an object', async () => {
      expect(
        await expander.expandRecord(
          { port: 8080, enabled: true } as unknown as Expandable,
          options,
        ),
      ).to.deep.equal({ port: 8080, enabled: true });
    });
  });

  test('works as expected', async () => {
    await expandRecordFn(
      {
        defaults: {
          docker: {
            // eslint-disable-next-line no-template-curly-in-string
            tag: '${env:DOCKER_TAG:-latest}',
          },
        },
      },
      {
        sources: {
          env: {
            DOCKER_TAG: 'test',
          },
        },
      },
    );
    expect(expandRecordFn).to.toHaveResolvedWith({
      defaults: {
        docker: {
          tag: 'test',
        },
      },
    });
    expandRecordFn.mockReset();

    expect(expander.expansionCount).to.equal(1);
  });

  describe('when facing array properties (non-regression)', async () => {
    test('supports simple string arrays', async () => {
      const toExpand = {
        someHash: {
          key: 'value',
        },
        // eslint-disable-next-line no-template-curly-in-string
        array: ['one', 'two', '${env:DOCKER_TAG}'],
      };

      expect(
        await expandRecordFn(toExpand, {
          sources: {
            env: {
              DOCKER_TAG: 'production',
            },
          },
        }),
      ).to.deep.equal({
        someHash: {
          key: 'value',
        },
        array: ['one', 'two', 'production'],
      });
    });

    test('supports arrays of objects', async () => {
      const toExpand = {
        array: [
          {
            op: 'replace',
            path: '/foo/bar/baz',
            // eslint-disable-next-line no-template-curly-in-string
            value: '${env:DOCKER_TAG}',
          },
        ],
      };

      expect(
        await expandRecordFn(toExpand, {
          sources: {
            env: {
              DOCKER_TAG: 'production',
            },
          },
        }),
      ).to.deep.equal({
        array: [
          {
            op: 'replace',
            path: '/foo/bar/baz',
            value: 'production',
          },
        ],
      });
    });
  });
});
