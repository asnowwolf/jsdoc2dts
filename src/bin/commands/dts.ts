import { readFileSync } from 'fs';
import { CommandBuilder } from 'yargs';
import { docToDts } from '../../doc-to-dts';
import { typeMapping } from '../../type-mapping';

export const command = `dts <targetDir> <sourceGlob...>`;

export const describe = '从 es5/es6 源码中收集 jsdoc 注释，输出为 *.d.ts 格式，放到 targetDir 目录下';

export const builder: CommandBuilder = {
  targetDir: {
    description: '输出目录',
  },
  sourceGlob: {
    description: '源文件列表，可以使用 glob 通配符，参见 https://github.com/isaacs/node-glob#glob-primer',
  },
  types: {
    type: 'string',
    description: '名字->类型对照表，JSON 格式，key 为名字（可以为字符串），value 为类型表达式',
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
