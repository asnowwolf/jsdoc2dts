import { readFileSync, writeFileSync } from 'fs';
import { explainSync } from 'jsdoc-api';
import { sync as mkdirp } from 'mkdirp';
import * as path from 'path';
import { preprocess } from './preprocess';

export function exportJson(srcFile: string, destFile: string): void {
  destFile = destFile.replace(/\.js$/, '.json');

  const jsDocAst = explainSync({ files: srcFile });
  const fileContent = readFileSync(srcFile, 'utf-8');
  preprocess(jsDocAst, fileContent);
  mkdirp(path.dirname(destFile));
  writeFileSync(destFile, JSON.stringify(jsDocAst, null, 2), 'utf-8');
}
