import { JsDocEntry } from 'jsdoc-api';
import { SourceFile } from 'typescript';

export function getClasses(jsDocAst: JsDocEntry[]): JsDocEntry[] {
  return jsDocAst.filter(it => it.kind === 'function' && (!it.memberof || it.memberof === '<anonymous>'));
}

export function transformContent(jsDocAst: JsDocEntry[], tsFile: SourceFile): void {
  const classes = getClasses(jsDocAst);
  console.log(classes);
}
