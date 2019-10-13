import { expect } from 'chai';
import { removeCommonParts } from './remove-common-parts';

describe('removeCommonParts', () => {
  it('remove common parts (same folder)', () => {
    expect(removeCommonParts(['a/b/c/d.js', 'a/b/c/e.js'])).eql(['d.js', 'e.js']);
  });

  it('remove common parts (different folder)', () => {
    expect(removeCommonParts(['a/b/a/d.js', 'a/b/c/e.js'])).eql(['a/d.js', 'c/e.js']);
  });
});
