import { expect } from 'chai';
import { explainSync } from 'jsdoc-api';
import * as ts from 'typescript';
import { getClasses } from './transform-content';

describe('transform ast', () => {
  it('get classes', () => {
    const jsDocAst = explainSync({ files: './src/test/samples/Graph.js' });
    expect(getClasses(jsDocAst).map(it => it.longname)).eql(['Graph']);
  });

  it('parse TS', () => {
    const source = ts.createSourceFile('', '/** a */\nconst a: Temp', ts.ScriptTarget.ES2015);
    console.log(source.statements);
  });
});
