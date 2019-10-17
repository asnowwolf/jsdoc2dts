import { Code, JsDocEntry } from 'jsdoc-api';
import { uniqBy } from 'lodash';
import * as ts from 'typescript';
import { isArray, isBoolean, isNumber, isString } from 'util';

const ReferenceTypes = {
  cell: 'mxCell',
  evt: 'Event',
  node: 'Node',
  container: 'HTMLElement',
};

const KeywordTypes = {
  width: ts.SyntaxKind.NumberKeyword,
  height: ts.SyntaxKind.NumberKeyword,
  w: ts.SyntaxKind.NumberKeyword,
  h: ts.SyntaxKind.NumberKeyword,
  length: ts.SyntaxKind.NumberKeyword,
  index: ts.SyntaxKind.NumberKeyword,
  x: ts.SyntaxKind.NumberKeyword,
  y: ts.SyntaxKind.NumberKeyword,
  dx: ts.SyntaxKind.NumberKeyword,
  dy: ts.SyntaxKind.NumberKeyword,
  href: ts.SyntaxKind.StringKeyword,
  text: ts.SyntaxKind.StringKeyword,
  url: ts.SyntaxKind.StringKeyword,
  target: ts.SyntaxKind.StringKeyword,
  link: ts.SyntaxKind.StringKeyword,
  name: ts.SyntaxKind.StringKeyword,
  tagName: ts.SyntaxKind.StringKeyword,
  evtName: ts.SyntaxKind.StringKeyword,
  str: ts.SyntaxKind.StringKeyword,
  attributeName: ts.SyntaxKind.StringKeyword,
  label: ts.SyntaxKind.StringKeyword,
  html: ts.SyntaxKind.StringKeyword,
  clone: ts.SyntaxKind.BooleanKeyword,
  hasShadow: ts.SyntaxKind.BooleanKeyword,
  showText: ts.SyntaxKind.BooleanKeyword,
  nocrop: ts.SyntaxKind.BooleanKeyword,
  allowOpener: ts.SyntaxKind.BooleanKeyword,
};

const ArrayTypes = {
  names: ts.createArrayTypeNode(ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)),
  cells: ts.createArrayTypeNode(ts.createTypeReferenceNode('mxCell', undefined)),
};

export function getClasses(jsDocAst: JsDocEntry[]): JsDocEntry[] {
  return jsDocAst.filter(it => it.kind === 'class');
}

function inferTypeByName(name: string): ts.TypeNode | undefined {
  const referenceType = ReferenceTypes[name];
  if (referenceType) {
    return ts.createTypeReferenceNode(referenceType, undefined);
  }
  const keywordType = KeywordTypes[name];
  if (keywordType) {
    return ts.createKeywordTypeNode(keywordType);
  }

  const arrayType = ArrayTypes[name];
  if (arrayType) {
    return arrayType;
  }
}

function createParameter(name: string): ts.ParameterDeclaration {
  const type = inferTypeByName(name);
  return ts.createParameter([], [], undefined, name, undefined, type);
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
  return ts.SyntaxKind.UnknownKeyword;
}

function detectArrayType(value: string): ts.KeywordTypeNode['kind'] {
  const array = JSON.parse(value) as any[];
  if (isArray(array)) {
    return detectType(array[0]);
  }
  return ts.SyntaxKind.AnyKeyword;
}

function typeOf(code: Code): ts.TypeNode {
  switch (code.type) {
    // 数组
    case 'ArrayExpression':
      return ts.createArrayTypeNode(ts.createKeywordTypeNode(detectArrayType(code.value as string)));
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
    // 对象表达式
    case 'ObjectExpression':
      return ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);
    // // 成员表达式，用于声明哈希对象
    // case 'MemberExpression':
    //   return ts.createTypeNode();
    // // new 表达式
    case 'NewExpression':
      const typeName = code.fragment!.replace(/^.*\bnew +(\w+).*$/, '$1');
      return ts.createTypeReferenceNode(typeName, []);
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

function createConstructor(clazz) {
  return ts.createConstructor([], [], clazz.meta!.code.paramnames!.map(name => createParameter(name)), undefined);
}

function toMultilineComment(comment?: string): string {
  if (!comment) {
    return '';
  }
  return comment.split('\n').map(line => ` * ${line}`).concat('').join('\n');
}

function addComment<T extends ts.Node>(node: T, entry: JsDocEntry): T {
  const value = entry.meta && entry.meta.code && entry.meta.code.value;
  if (entry.description || value) {
    const exampleComment = value ? ` * @example ${value}\n` : '';
    const comment = `*\n${toMultilineComment(entry.description)}${exampleComment} `;
    return ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, comment, true);
  } else {
    return node;
  }
}

export function transformContent(jsDocAst: JsDocEntry[]): ts.NodeArray<ts.Statement> {
  const statements = getClasses(jsDocAst).map(clazz => {
    const variables = uniqBy(jsDocAst.filter(it => it.kind === 'member' && it.scope === 'instance' && it.memberof === clazz.name), 'name')
      .map(it => addComment(createProperty(it), it));
    const methods = uniqBy(jsDocAst.filter(it => it.kind === 'function' && it.scope === 'instance' && it.memberof === clazz.name), 'name')
      .map(it => addComment(createMethod(it), it));
    const staticVariables = uniqBy(jsDocAst.filter(it => it.kind === 'member' && it.scope === 'static' && it.memberof === clazz.name), 'name')
      .map(it => addComment(createProperty(it), it));
    const staticMethods = uniqBy(jsDocAst.filter(it => it.kind === 'function' && it.scope === 'static' && it.memberof === clazz.name), 'name')
      .map(it => addComment(createMethod(it), it));
    const constructor = createConstructor(clazz);
    return addComment(ts.createClassDeclaration(
      [],
      [ts.createModifier(ts.SyntaxKind.DeclareKeyword)],
      clazz.name,
      [],
      [],
      [
        constructor,
        ...variables,
        ...methods,
        ...staticVariables,
        ...staticMethods,
      ],
    ), clazz);
  });

  return ts.createNodeArray(statements, true);
}
