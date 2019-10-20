import { sync as globby } from 'globby';
import * as path from 'path';
import { transformFile } from './transform-file';
import { removeCommonParts } from './utils/remove-common-parts';

export function docToTs(sourceGlob: string[], targetDir: string, dts: boolean): void {
  const files = sourceGlob.map(it => globby(it)).flat();
  const relativeFiles = removeCommonParts(files);
  files.forEach((file, index) => transformFile(file, path.join(targetDir, relativeFiles[index]), dts));
}
