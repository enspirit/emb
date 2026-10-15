import { describe, expect, test } from 'vitest';

import { filterImageRefsByTag, parseImageRef } from '@/docker';

describe('Docker / Images / imageRefs', () => {
  describe('parseImageRef()', () => {
    test('splits name and tag', () => {
      expect(parseImageRef('klaro/api:MR-42')).to.deep.equal({
        name: 'klaro/api',
        tag: 'MR-42',
      });
    });

    test('keeps registry ports in the name', () => {
      expect(parseImageRef('localhost:5000/klaro/api:1.0')).to.deep.equal({
        name: 'localhost:5000/klaro/api',
        tag: '1.0',
      });
    });

    test('defaults to latest when there is no tag', () => {
      expect(parseImageRef('localhost:5000/klaro/api')).to.deep.equal({
        name: 'localhost:5000/klaro/api',
        tag: 'latest',
      });
    });
  });

  describe('filterImageRefsByTag()', () => {
    const refs = [
      'klaro/api:latest',
      'klaro/api:MR-42',
      'klaro/web:MR-42-production',
    ];

    test('keeps references with one of the given tags', () => {
      expect(
        filterImageRefsByTag(refs, ['MR-42', 'MR-42-production']),
      ).to.deep.equal(['klaro/api:MR-42', 'klaro/web:MR-42-production']);
    });

    test('matches tags exactly, not by prefix', () => {
      expect(filterImageRefsByTag(refs, ['MR-4'])).to.deep.equal([]);
    });

    test('keeps everything when no tags are given', () => {
      expect(filterImageRefsByTag(refs)).to.deep.equal(refs);
      expect(filterImageRefsByTag(refs, [])).to.deep.equal(refs);
    });

    test('keeps nothing for an empty tag value', () => {
      expect(filterImageRefsByTag(refs, [''])).to.deep.equal([]);
    });
  });
});
