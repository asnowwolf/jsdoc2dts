import { sync as globby } from 'globby';
import * as path from 'path';
import { transformFile } from './transform-file';
import { removeCommonParts } from './utils/remove-common-parts';

export function docToDts(sourceGlob: string[], targetDir: string): void {
  const files = sourceGlob.map(it => globby(it)).flat();
  const relativeFiles = removeCommonParts(files);
  files.forEach((file, index) => transformFile(file, path.join(targetDir, relativeFiles[index])));
}
