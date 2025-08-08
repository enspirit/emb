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
});
