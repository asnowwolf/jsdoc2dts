import { sync as globby } from 'globby';
import * as path from 'path';
import { exportJson } from './export-json';
import { removeCommonParts } from './utils/remove-common-parts';

export function docToJson(sourceGlob: string[], targetDir: string): void {
  const files = sourceGlob.map(it => globby(it)).flat();
  const relativeFiles = removeCommonParts(files);
  files.forEach((file, index) => exportJson(file, path.join(targetDir, relativeFiles[index])));
}
