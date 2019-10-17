import { readFileSync } from 'fs';
import { CommandBuilder } from 'yargs';
import { docToDts } from '../../doc-to-dts';
import { typeMapping } from '../../type-mapping';

export const command = `dts <targetDir> <sourceGlob...>`;

export const describe = 'Collect jsdoc comments from es5/es6 source, output in *.d.ts format, and put them in targetDir directory';

export const builder: CommandBuilder = {
  targetDir: {
    description: 'The output directory',
  },
  sourceGlob: {
    description: 'A list of source files that support the glob wildcard syntax, see https://github.com/isaacs/node-glob#glob-primer',
  },
  types: {
    type: 'string',
    description: 'A "name->type" mapping file in JSON format. The key is the name (supports RegExp) and the value is a type expression',
  },
};

interface Params {
  sourceGlob: string[];
  targetDir: string;
  types: string;
}

export const handler = function ({ sourceGlob, targetDir, types }: Params) {
  const mapping = JSON.parse(readFileSync(types, 'utf-8'));
  Object.assign(typeMapping, mapping);
  docToDts(sourceGlob, targetDir);
};
