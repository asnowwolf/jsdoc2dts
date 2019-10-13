import { writeFileSync } from 'fs';
import { explainSync } from 'jsdoc-api';
import { sync as mkdirp } from 'mkdirp';
import * as path from 'path';

export function transformFile(srcFile: string, destFile: string): void {
  const result = explainSync({ files: srcFile });
  destFile = destFile.replace(/\.js$/, '.json');
  mkdirp(path.dirname(destFile));
  writeFileSync(destFile, JSON.stringify(result, null, 2), 'utf-8');
}
