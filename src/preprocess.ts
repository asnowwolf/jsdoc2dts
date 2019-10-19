import { JsDocEntry } from './jsdoc-api';

export function preprocess(ast: JsDocEntry[], fileContent: string): void {
  ast.forEach(entry => {
    if (entry.meta && entry.meta.code && entry.meta.range) {
      return entry.meta.code.fragment = fileContent.slice(entry.meta.range[0], entry.meta.range[1]);
    }
  });
}
