import { expect } from 'chai';
import { readFileSync } from 'fs';
import { explainSync } from 'jsdoc-api';
import * as ts from 'typescript';
import { getClasses } from './transform-content';

describe('transform ast', () => {
  it('get classes', () => {
    const jsDocAst = explainSync({ files: './src/test/samples/Graph.js' });
    expect(getClasses(jsDocAst).map(it => it.longname)).eql(['Graph']);
  });

  it('parse TS', () => {
    const source = ts.createSourceFile('a.ts', 'class B extends A {}', ts.ScriptTarget.ES2015);
    const statement = source.statements[0] as ts.VariableStatement;
    console.log(statement.declarationList.declarations[0].type);
  });

  it('js to TS', () => {
    const content = readFileSync('src/test/samples/Graph.js', 'utf-8');
    const source = ts.createSourceFile('a.js', content, ts.ScriptTarget.ES5, undefined, ts.ScriptKind.JS);
    const dest = ts.createSourceFile('a.ts', '', ts.ScriptTarget.ES2015, undefined, ts.ScriptKind.TS);
    expect(ts.createPrinter().printList(ts.ListFormat.MultiLine, source.statements, dest)).eql(content);
  });
});
