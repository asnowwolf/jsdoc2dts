import { JsDocEntry } from 'jsdoc-api';
import * as ts from 'typescript';

export function getClasses(jsDocAst: JsDocEntry[]): JsDocEntry[] {
  return jsDocAst.filter(it => it.kind === 'class');
}

export function transformContent(jsDocAst: JsDocEntry[]): ts.NodeArray<ts.Statement> {
  // 找出所有顶级节点：顶级类，顶级函数
  // 找出顶级类的所有属性和方法、静态属性静态和方法 prototype，this.属性 和 this.prototype.属性 都是实例属性，this.方法是静态方法，this.prototype.方法 是实例方法
  // 找出所有属性
  const statements = getClasses(jsDocAst).map(it => {
    const decorators: ReadonlyArray<ts.Decorator> = [];
    const modifiers: ReadonlyArray<ts.Modifier> = [
      ts.createModifier(ts.SyntaxKind.ExportKeyword),
    ];
    const name = it.name;
    const typeParameters: ReadonlyArray<ts.TypeParameterDeclaration> | undefined = [];
    const heritageClauses: ReadonlyArray<ts.HeritageClause> | undefined = [];
    const members: ReadonlyArray<ts.ClassElement> = [];

    return ts.createClassDeclaration(decorators, modifiers, name, typeParameters, heritageClauses, members);
  });

  return ts.createNodeArray(statements, true);
}
