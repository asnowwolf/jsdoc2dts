import { CommandBuilder } from 'yargs';
import { docToDts } from '../../doc-to-dts';

export const command = `dts <targetDir> <sourceGlob...>`;

export const describe = '从 es5/es6 源码中收集 jsdoc 注释，输出为 *.d.ts 格式，放到 targetDir 目录下';

export const builder: CommandBuilder = {
  targetDir: {
    description: '输出目录',
  },
  sourceGlob: {
    description: '源文件列表，可以使用 glob 通配符，参见 https://github.com/isaacs/node-glob#glob-primer',
  },
};

interface Params {
  sourceGlob: string[];
  targetDir: string;
}

export const handler = function ({ sourceGlob, targetDir }: Params) {
  docToDts(sourceGlob, targetDir);
};
