import { CommandBuilder } from 'yargs';
import { docToJson } from '../../doc-to-json';

export const command = `ast <targetDir> <sourceGlob...>`;

export const describe = 'Collect jsdoc comments from the es5/es6 source and output the parsed results in JSON format to the targetDir directory.';

export const builder: CommandBuilder = {
  targetDir: {
    description: 'The output directory',
  },
  sourceGlob: {
    description: 'A list of source files that support the glob wildcard syntax, see https://github.com/isaacs/node-glob#glob-primer',
  },
};

interface Params {
  sourceGlob: string[];
  targetDir: string;
}

export const handler = function ({ sourceGlob, targetDir }: Params) {
  docToJson(sourceGlob, targetDir);
};
