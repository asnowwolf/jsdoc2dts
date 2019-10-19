import * as path from 'path';

function findFirstDiffIndex(parts: string[][]): number {
  const firstPart = parts[0];
  const otherParts = parts.slice(1);
  for (let i = 0; i < firstPart.length; ++i) {
    const dir = firstPart[i];
    if (otherParts.find(part => part[i] !== dir)) {
      return i;
    }
  }
  return -1;
}

export function removeCommonParts(files: string[]): string[] {
  if (!files.join('')) {
    return [];
  }
  const parts = files.map(file => file.split(path.sep));
  const index = findFirstDiffIndex(parts);
  if (index === -1) {
    return files;
  } else {
    return parts.map(dirs => dirs.slice(index).join(path.sep));
  }
}
