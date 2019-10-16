import { JsDocEntry } from 'jsdoc-api';
import { uniqBy } from 'lodash';
import * as ts from 'typescript';

export function getClasses(jsDocAst: JsDocEntry[]): JsDocEntry[] {
  return jsDocAst.filter(it => it.kind === 'class');
}

function createParameter(name: string): ts.ParameterDeclaration {
  return ts.createParameter([], [], undefined, name);
}

function createMethod(modifiers: ts.Modifier[], name: string, paramNames: string[]): ts.MethodDeclaration {
  return ts.createMethod([], [], undefined, name, undefined, undefined,
    paramNames.map(name => createParameter(name)), undefined, undefined);
}

export function transformContent(jsDocAst: JsDocEntry[]): ts.NodeArray<ts.Statement> {
  // 找出所有顶级节点：顶级类，顶级函数
  // 找出顶级类的所有属性和方法、静态属性静态和方法 prototype，this.属性 和 this.prototype.属性 都是实例属性，this.方法是静态方法，this.prototype.方法 是实例方法
  // 找出所有属性
  const statements = getClasses(jsDocAst).map(clazz => {
    const variables = uniqBy(jsDocAst.filter(it => it.kind === 'member' && it.scope === 'instance' && it.memberof === clazz.name), 'name')
      .map(it => ts.createProperty([], [], it.name!, undefined, undefined, undefined));
    const methods = uniqBy(jsDocAst.filter(it => it.kind === 'function' && it.scope === 'instance' && it.memberof === clazz.name), 'name')
      .map(it => createMethod([], it.name!, it.meta!.code!.paramnames!));
    const staticVariables = uniqBy(jsDocAst.filter(it => it.kind === 'member' && it.scope === 'static' && it.memberof === clazz.name), 'name')
      .map(it => ts.createProperty([], [ts.createModifier(ts.SyntaxKind.StaticKeyword)], it.name!, undefined, undefined, undefined));
    const staticMethods = uniqBy(jsDocAst.filter(it => it.kind === 'function' && it.scope === 'static' && it.memberof === clazz.name), 'name')
      .map(it => createMethod([ts.createModifier(ts.SyntaxKind.StaticKeyword)], it.name!, it.meta!.code!.paramnames!));
    return ts.createClassDeclaration(
      [],
      [ts.createModifier(ts.SyntaxKind.DeclareKeyword)],
      clazz.name,
      [],
      [],
      [
        createMethod([], 'constructor', clazz.meta!.code!.paramnames!),
        ...variables,
        ...methods,
        ...staticVariables,
        ...staticMethods,
      ],
    );
  });

  return ts.createNodeArray(statements, true);
}
