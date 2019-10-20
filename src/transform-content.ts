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
  if (typeExpression === 'Array.<function()>') {
    typeExpression = 'Function[]';
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

function parseStatements(script: string): ts.NodeArray<ts.Statement> {
  return ts.createSourceFile('anonymouse.js', script, ts.ScriptTarget.ES5).statements;
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

function createBody(entry: JsDocEntry): ts.Block | undefined {
  if (!entry.meta || !entry.meta.code.fragment) {
    return;
  }
  const statements = parseStatements(entry.meta.code.fragment);
  const statement = statements[0] as ts.ExpressionStatement;
  const expression = statement.expression as ts.AssignmentExpression<ts.AssignmentOperatorToken>;
  const fn = expression.right as ts.FunctionExpression;
  return ts.createBlock(fn.body.statements, true);
}

function createMethod(dts: boolean, entry: JsDocEntry): ts.MethodDeclaration {
  return ts.createMethod([], modifierOf(entry), undefined, entry.name!, undefined, undefined,
    createParameters(entry), createReturnType(entry), dts ? undefined : createBody(entry));
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

function parseConstructor(entry: JsDocEntry): ts.Block | undefined {
  if (!entry.meta || !entry.meta.code.fragment) {
    return;
  }
  const statements = parseStatements(entry.meta.code.fragment);
  if (statements[0].kind === ts.SyntaxKind.FunctionExpression || statements[0].kind === ts.SyntaxKind.FunctionDeclaration) {
    const statement = statements[0] as any as ts.FunctionExpression;
    return ts.createBlock(ts.createNodeArray(statement.body.statements, true), true);
  } else if (statements[0].kind === ts.SyntaxKind.ExpressionStatement) {
    return createBody(entry);
  } else {
    debugger;
  }
}


function createConstructor(dts: boolean, clazz: JsDocEntry): ts.ConstructorDeclaration[] {
  const params = createParameters(clazz);
  if (!params.length) {
    return [];
  }
  const body = parseConstructor(clazz);
  return [ts.createConstructor([], [], params, dts ? undefined : body)];
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

function createHeritageClauses(clazz: JsDocEntry): ts.HeritageClause[] {
  if (!clazz.augments) {
    return [];
  }
  return clazz.augments.map(name => ts.createHeritageClause(
    ts.SyntaxKind.ExtendsKeyword,
    [ts.createExpressionWithTypeArguments(undefined, ts.createIdentifier(name))],
  ));
}

function createClasses(entries: JsDocEntry[], dts: boolean): ts.ClassDeclaration[] {
  return getClasses(entries).map(clazz => {
    const members = uniqBy(entries.filter(it => it.memberof === clazz.name), 'name');
    const variables = members.filter(it => it.kind === 'member' && it.scope === 'instance')
      .map(it => addComment(createProperty(it), it));
    const methods = members.filter(it => it.kind === 'function' && it.scope === 'instance')
      .map(it => addComment(createMethod(dts, it), it));
    const staticVariables = members.filter(it => it.kind === 'member' && it.scope === 'static')
      .map(it => addComment(createProperty(it), it));
    const staticMethods = members.filter(it => it.kind === 'function' && it.scope === 'static')
      .map(it => addComment(createMethod(dts, it), it));
    const constructor = createConstructor(dts, clazz);
    const heritageClauses = createHeritageClauses(clazz);
    return addComment(ts.createClassDeclaration(
      [],
      [ts.createModifier(dts ? ts.SyntaxKind.DeclareKeyword : ts.SyntaxKind.ExportKeyword)],
      clazz.name,
      [],
      heritageClauses,
      [
        ...constructor,
        ...variables,
        ...methods,
        ...staticVariables,
        ...staticMethods,
      ],
    ), clazz);
  });
}

function parseInitializer(code: Code): ts.Expression | undefined {
  if (!code.fragment) {
    return;
  }
  const source = ts.createSourceFile('anonymous.js', code.fragment, ts.ScriptTarget.ES5);
  const statement = source.statements[0] as ts.ExpressionStatement;
  const assign = statement.expression as ts.BinaryExpression;
  return assign.right;
}

function createVariables(entries: JsDocEntry[], dts: boolean): ts.VariableStatement[] {
  const members = entries.filter(it => it.scope === 'global' && it.kind === 'member' && /^\w+$/.test(it.name!));
  return members.map(member => ts.createVariableStatement(
    [ts.createModifier(dts ? ts.SyntaxKind.DeclareKeyword : ts.SyntaxKind.ExportKeyword)],
    [ts.createVariableDeclaration(member.name!, undefined, parseInitializer(member.meta!.code))],
  ));
}

export function transformContent(jsDocAst: JsDocEntry[], dts: boolean): ts.NodeArray<ts.Statement> {
  const entries = jsDocAst
    .filter(it => !!it.meta)
    .filter(it => !!it.name)
    .filter(it => !it.name!.includes('['))
    .filter(it => it.name! !== 'constructor');

  const variables: ts.Statement[] = createVariables(entries, dts);
  const classes: ts.Statement[] = createClasses(entries, dts);

  return ts.createNodeArray<ts.Statement>([...variables, ...classes], true);
}
