import { readFileSync } from 'fs';
import { CommandBuilder } from 'yargs';
import { docToTs } from '../../doc-to-ts';
import { typeMapping } from '../../type-mapping';

export const command = `ts <targetDir> <sourceGlob...>`;

export const describe = 'Collect jsdoc comments from es5/es6 source, output in *.ts format, and put them in targetDir directory';

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
  if (types) {
    const mapping = JSON.parse(readFileSync(types, 'utf-8'));
    Object.assign(typeMapping, mapping);
  }
  docToTs(sourceGlob, targetDir, false);
};
