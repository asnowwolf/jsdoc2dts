import { Code, JsDocEntry, ParamDef } from 'jsdoc-api';
import { uniqBy } from 'lodash';
import * as ts from 'typescript';
import { isArray, isBoolean, isNumber, isString } from 'util';
import { typeMapping } from './type-mapping';

export function getClasses(jsDocAst: JsDocEntry[]): JsDocEntry[] {
  return jsDocAst.filter(it => it.kind === 'class');
}

const anyType = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);

function parseTypeNode(typeExpression: string): ts.TypeNode {
  if (typeExpression === '*') {
    return anyType;
  }
  if (typeExpression === 'function' || typeExpression === 'callback') {
    typeExpression = 'Function';
  }
  if (typeExpression === 'Object') {
    typeExpression = 'object';
  }
  const sourceFile = ts.createSourceFile('anonymouse.js', `const a: ${typeExpression}`, ts.ScriptTarget.ES5);
  const statement = sourceFile.statements[0] as ts.VariableStatement;
  return statement.declarationList.declarations[0].type || anyType;
}

export function inferTypeByName(name?: string): ts.TypeNode {
  if (!name) {
    return anyType;
  }
  name = name.replace(/^.*?(\w+)$/, '$1');
  const entries = Object.entries(typeMapping);
  const [, typeExpression] = entries.find(([key]) => new RegExp(`^${key}$`).test(name!)) || [];
  if (typeExpression) {
    return parseTypeNode(typeExpression);
  } else {
    return anyType;
  }
}

function isAnyType(type?: ts.TypeNode): boolean {
  return !!type && type.kind === ts.SyntaxKind.AnyKeyword;
}

function parseTypeNodes(names: string[]): ts.TypeNode {
  const types = names.map(it => parseTypeNode(it)).filter(it => !isAnyType(it));
  if (!!types.length) {
    return ts.createUnionTypeNode(types);
  } else {
    return anyType;
  }
}

function createParameter(name: string, params: ParamDef[] = []): ts.ParameterDeclaration {
  const param = params.find(it => it.name === name);
  const exactType = param && param.type ? parseTypeNodes(param.type.names) : undefined;
  const type = exactType && !isAnyType(exactType) ? exactType : inferTypeByName(name);
  return ts.createParameter([], [], undefined, name, undefined, type);
}

function modifierOf(entry: JsDocEntry) {
  const modifiers: ts.Modifier[] = [];
  if (entry.scope === 'static') {
    modifiers.push(ts.createModifier(ts.SyntaxKind.StaticKeyword));
  }
  return modifiers;
}

function createParameters(entry: JsDocEntry): ts.ParameterDeclaration[] {
  if (!entry.meta || !entry.meta.code.paramnames) {
    return [];
  }
  return entry.meta.code.paramnames.map(name => createParameter(name, entry.params));
}

function createReturnType(entry: JsDocEntry): ts.TypeNode {
  if (entry.returns) {
    const types = entry.returns.map(it => it.type && it.type.names.map(name => parseTypeNode(name)))
      .flat().filter(it => !!it).map(it => it!);
    if (types.length) {
      return ts.createUnionTypeNode(types);
    }
  }
  if (entry.meta && entry.meta.code.fragment && !entry.meta!.code.fragment!.match(/\breturn +/)) {
    return ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
  }
  return inferTypeByName(entry.name);
}

function createMethod(entry: JsDocEntry): ts.MethodDeclaration {
  return ts.createMethod([], modifierOf(entry), undefined, entry.name!, undefined, undefined,
    createParameters(entry), createReturnType(entry), undefined);
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

function detectArrayType(value: string): ts.KeywordTypeNode['kind'] {
  const array = JSON.parse(value) as any[];
  if (isArray(array)) {
    return detectType(array[0]);
  }
  return ts.SyntaxKind.AnyKeyword;
}

function typeOf(code: Code): ts.TypeNode | undefined {
  switch (code.type) {
    // 数组
    case 'ArrayExpression':
      return ts.createArrayTypeNode(ts.createKeywordTypeNode(detectArrayType(code.value as string)));
    // // 赋值表达式，如 a = b = 1;
    // case 'AssignmentExpression':
    //   return ts.createTypeNode();
    // // 二元表达式
    // case 'BinaryExpression':
    //   return ts.createTypeNode();
    // // 函数调用
    // case 'CallExpression':
    //   return ts.createTypeNode();
    // // // 条件表达式（三目）
    // case 'ConditionalExpression':
    //   return ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    // // 普通函数声明
    case 'FunctionDeclaration':
      return ts.createTypeReferenceNode('Function', undefined);
    // 函数表达式式声明（匿名函数赋值）
    case 'FunctionExpression':
      return ts.createTypeReferenceNode('Function', undefined);
    // // 对属性赋值
    // case 'Identifier':
    //   return ts.createTypeNode();
    // // 字面量赋值
    case 'Literal':
      return ts.createKeywordTypeNode(detectType(code.value));
    // // 逻辑表达式
    // case 'LogicalExpression':
    //   return ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    // 对象表达式
    case 'ObjectExpression':
      return ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);
    // // 成员表达式，用于声明哈希对象
    // case 'MemberExpression':
    //   return ts.createTypeNode();
    // // new 表达式
    case 'NewExpression':
      const matches = code.fragment!.match(/^.*\bnew +(\w+).*$/);
      if (matches) {
        return ts.createTypeReferenceNode(matches[1], []);
      } else {
        return inferTypeByName(code.name);
      }
    // 一元表达式
    case 'UnaryExpression':
      return ts.createKeywordTypeNode(detectType(code.value));
    default:
      return anyType;
  }
}

function createProperty(entry: JsDocEntry): ts.PropertyDeclaration {
  const code = entry.meta!.code!;
  const exactType = entry.type ? parseTypeNodes(entry.type.names) : typeOf(code);
  const type = isAnyType(exactType) ? inferTypeByName(code.name) : exactType;
  return ts.createProperty([], modifierOf(entry), entry.name!, undefined, type, undefined);
}

function createConstructor(clazz: JsDocEntry): ts.ConstructorDeclaration {
  return ts.createConstructor([], [], createParameters(clazz), undefined);
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
    const exampleComment = value && entry.meta!.code.type === 'Literal' ? ` * @example ${value}\n` : '';
    const comment = `${toMultilineComment(entry.description)}${exampleComment}`;
    if (comment) {
      return ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, `*\n${comment} `, true);
    }
  }
  return node;
}

export function transformContent(jsDocAst: JsDocEntry[]): ts.NodeArray<ts.Statement> {
  const entries = jsDocAst.filter(it => !!it.meta).filter(it => !!it.name).filter(it => !it.name!.includes('['));

  const statements = getClasses(entries).map(clazz => {
    const members = uniqBy(entries.filter(it => it.memberof === clazz.name), 'name');
    const variables = members.filter(it => it.kind === 'member' && it.scope === 'instance')
      .map(it => addComment(createProperty(it), it));
    const methods = members.filter(it => it.kind === 'function' && it.scope === 'instance')
      .map(it => addComment(createMethod(it), it));
    const staticVariables = members.filter(it => it.kind === 'member' && it.scope === 'static')
      .map(it => addComment(createProperty(it), it));
    const staticMethods = members.filter(it => it.kind === 'function' && it.scope === 'static')
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
