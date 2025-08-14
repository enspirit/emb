import { describe, expect, test, vi } from 'vitest';

import { TemplateExpander } from '@/utils';

describe('Utils / expandRecord', () => {
  const expander = new TemplateExpander();
  const expandRecordFn = vi.fn((record, opts) =>
    expander.expandRecord(record, opts),
  );

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
