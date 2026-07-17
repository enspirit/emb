import { describe, expect, test } from 'vitest';

import { projectImageTags } from '@/docker';

describe('Docker / Images / projectImageTags', () => {
  test('keeps tags that belong to the project (name/ boundary)', () => {
    const tags = projectImageTags(['foo/api:latest', 'foo/web:v2'], 'foo');

    expect(tags).to.deep.equal(['foo/api:latest', 'foo/web:v2']);
  });

  test('excludes a different project whose name merely starts the same', () => {
    // The old `tag.indexOf(name) === 0` prefix match wrongly captured this.
    const tags = projectImageTags(
      ['foo/api:latest', 'foobar/api:latest'],
      'foo',
    );

    expect(tags).to.deep.equal(['foo/api:latest']);
  });

  test('excludes unrelated tags', () => {
    const tags = projectImageTags(
      ['foo/api:latest', 'redis:7', '<none>:<none>'],
      'foo',
    );

    expect(tags).to.deep.equal(['foo/api:latest']);
  });

  test('returns an empty list for missing RepoTags', () => {
    expect(projectImageTags(undefined, 'foo')).to.deep.equal([]);
    expect(projectImageTags(null, 'foo')).to.deep.equal([]);
    expect(projectImageTags([], 'foo')).to.deep.equal([]);
  });
});
