import { JsDocEntry } from 'jsdoc-api';
import { uniqBy } from 'lodash';
import * as ts from 'typescript';

export function getClasses(jsDocAst: JsDocEntry[]): JsDocEntry[] {
  return jsDocAst.filter(it => it.kind === 'class');
}

function createParameter(name: string): ts.ParameterDeclaration {
  return ts.createParameter([], [], undefined, name);
}

function modifierOf(entry: JsDocEntry) {
  const modifiers: ts.Modifier[] = [];
  if (entry.scope === 'static') {
    modifiers.push(ts.createModifier(ts.SyntaxKind.StaticKeyword));
  }
  return modifiers;
}

function createMethod(entry: JsDocEntry): ts.MethodDeclaration {
  return ts.createMethod([], modifierOf(entry), undefined, entry.name!, undefined, undefined,
    entry.meta!.code!.paramnames!.map(name => createParameter(name)), undefined, undefined);
}

function createProperty(entry: JsDocEntry): ts.PropertyDeclaration {
  return ts.createProperty([], modifierOf(entry), entry.name!, undefined, undefined, undefined);
}

export function transformContent(jsDocAst: JsDocEntry[]): ts.NodeArray<ts.Statement> {
  const statements = getClasses(jsDocAst).map(clazz => {
    const variables = uniqBy(jsDocAst.filter(it => it.kind === 'member' && it.scope === 'instance' && it.memberof === clazz.name), 'name')
      .map(it => createProperty(it));
    const methods = uniqBy(jsDocAst.filter(it => it.kind === 'function' && it.scope === 'instance' && it.memberof === clazz.name), 'name')
      .map(it => createMethod(it));
    const staticVariables = uniqBy(jsDocAst.filter(it => it.kind === 'member' && it.scope === 'static' && it.memberof === clazz.name), 'name')
      .map(it => createProperty(it));
    const staticMethods = uniqBy(jsDocAst.filter(it => it.kind === 'function' && it.scope === 'static' && it.memberof === clazz.name), 'name')
      .map(it => createMethod(it));
    return ts.createClassDeclaration(
      [],
      [ts.createModifier(ts.SyntaxKind.DeclareKeyword)],
      clazz.name,
      [],
      [],
      [
        ts.createConstructor([], [], clazz.meta!.code.paramnames!.map(name => createParameter(name)), undefined),
        ...variables,
        ...methods,
        ...staticVariables,
        ...staticMethods,
      ],
    );
  });

  return ts.createNodeArray(statements, true);
}
