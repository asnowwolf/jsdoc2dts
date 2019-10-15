import { expect } from 'chai';
import { explainSync } from 'jsdoc-api';
import { getClasses } from './transform-content';

describe('transform ast', () => {
  it('get classes', () => {
    const jsDocAst = explainSync({ files: './src/test/samples/Graph.js' });
    expect(getClasses(jsDocAst).map(it => it.longname)).eql(['Graph']);
  });
});
