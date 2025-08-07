import { describe, expect, test, vi } from 'vitest';

import { expandRecord } from '../../../src/utils/expand';

describe('Utils / expandRecord', () => {
  const expandRecordFn = vi.fn((record, opts) => expandRecord(record, opts));

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
  });
});
