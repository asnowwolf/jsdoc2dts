import { readFileSync, writeFileSync } from 'fs';
import { explainSync } from 'jsdoc-api';
import { sync as mkdirp } from 'mkdirp';
import * as path from 'path';
import { createPrinter, createSourceFile, ListFormat, Printer, ScriptKind, ScriptTarget, SourceFile } from 'typescript';
import { preprocess } from './preprocess';
import { transformContent } from './transform-content';

export function transformFile(srcFile: string, destFile: string, dts: boolean): void {
  destFile = destFile.replace(/\.js$/, dts ? '.d.ts' : '.ts');

  const printer: Printer = createPrinter();
  const sourceFile: SourceFile = createSourceFile(
    destFile, '', ScriptTarget.ES2015, true, ScriptKind.TS,
  );

  const jsDocAst = explainSync({ files: srcFile });
  const fileContent = readFileSync(srcFile, 'utf-8');
  preprocess(jsDocAst, fileContent);
  const statements = transformContent(jsDocAst, dts);

  const content = printer.printList(ListFormat.MultiLine, statements, sourceFile);
  mkdirp(path.dirname(destFile));
  writeFileSync(destFile, content, 'utf-8');
}
