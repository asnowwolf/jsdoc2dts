import { writeFileSync } from 'fs';
import { explainSync } from 'jsdoc-api';
import { sync as mkdirp } from 'mkdirp';
import * as path from 'path';
import { createPrinter, createSourceFile, Printer, ScriptKind, ScriptTarget, SourceFile } from 'typescript';
import { transformContent } from './transform-content';

export function transformFile(srcFile: string, destFile: string): void {
  destFile = destFile.replace(/\.js$/, '.d.ts');

  const printer: Printer = createPrinter();
  const sourceFile: SourceFile = createSourceFile(
    destFile, '', ScriptTarget.ES2015, true, ScriptKind.TS,
  );

  const jsDocAst = explainSync({ files: srcFile });
  transformContent(jsDocAst, sourceFile);

  const content = printer.printFile(sourceFile);
  mkdirp(path.dirname(destFile));
  writeFileSync(destFile, content, 'utf-8');
}
