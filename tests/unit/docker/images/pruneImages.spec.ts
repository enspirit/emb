import { EmbContext, getContext } from '@';
import { createTestContext } from 'tests/setup/set.context.js';
import { beforeEach, describe, expect, Mock, test } from 'vitest';

import { pruneImages } from '@/docker';

describe('Docker / pruneImages', () => {
  let context: EmbContext;
  let prune: Mock;

  beforeEach(async () => {
    await createTestContext();
    context = getContext();
    prune = context.docker.pruneImages as Mock;
    prune.mockResolvedValue({ ImagesDeleted: [], SpaceReclaimed: 0 });
  });

  test('nests dangling and label under a filters map', async () => {
    await pruneImages({ dangling: true, label: ['emb/project=test'] });

    // The Docker API only honours a single `filters` param; top-level
    // dangling/label are silently ignored, pruning every host image.
    expect(prune).toHaveBeenCalledExactlyOnceWith({
      filters: { dangling: ['true'], label: ['emb/project=test'] },
    });
  });

  test('passes dangling=false under filters for the --all path', async () => {
    await pruneImages({ dangling: false });

    expect(prune).toHaveBeenCalledExactlyOnceWith({
      filters: { dangling: ['false'] },
    });
  });
});
