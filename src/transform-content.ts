import { Code, JsDocEntry } from 'jsdoc-api';
import { uniqBy } from 'lodash';
import * as ts from 'typescript';
import { isBoolean, isNumber, isString } from 'util';

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

function detectType(value: boolean | number | string): ts.KeywordTypeNode['kind'] {
  if (isNumber(value)) {
    return ts.SyntaxKind.NumberKeyword;
  } else if (isBoolean(value)) {
    return ts.SyntaxKind.BooleanKeyword;
  } else if (isString(value)) {
    return ts.SyntaxKind.StringKeyword;
  }
  return ts.SyntaxKind.AnyKeyword;
}

function typeOf(code: Code): ts.TypeNode {
  switch (code.type) {
    // 数组
    case 'ArrayExpression':
      return ts.createArrayTypeNode(ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
    // // 赋值表达式（局部变量）
    // case 'AssignmentExpression':
    //   return ts.createTypeNode();
    // // 二元表达式
    // case 'BinaryExpression':
    //   return ts.createTypeNode();
    // // 函数调用
    // case 'CallExpression':
    //   return ts.createTypeNode();
    // // 条件表达式（三目）
    case 'ConditionalExpression':
      return ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    // // 普通函数声明
    // case 'FunctionDeclaration':
    //   return ts.createKeywordTypeNode(ts.SyntaxKind.FunctionKeyword);
    // // 函数表达式式声明（匿名函数赋值）
    // case 'FunctionExpression':
    //   return ts.createTypeNode();
    // // 对属性赋值
    // case 'Identifier':
    //   return ts.createTypeNode();
    // // 字面量赋值
    case 'Literal':
      return ts.createKeywordTypeNode(detectType(code.value));
    // 逻辑表达式
    case 'LogicalExpression':
      return ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    // // 成员表达式，用于声明哈希对象
    // case 'MemberExpression':
    //   return ts.createTypeNode();
    // // new 表达式
    // case 'NewExpression':
    //   return ts.createTypeNode();
    // 一元表达式
    case 'UnaryExpression':
      return ts.createKeywordTypeNode(detectType(code.value));
    default:
      return ts.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
  }
}

function createProperty(entry: JsDocEntry): ts.PropertyDeclaration {
  const code = entry.meta!.code!;
  return ts.createProperty([], modifierOf(entry), entry.name!, undefined, typeOf(code), undefined);
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
