export interface JsDocOptions {
  files?: string | string[];
  source?: string;
  cache?: boolean;
  access?: string;
  configure?: string;
  destination?: string;
  encoding?: string;
  private?: boolean;
  package?: string;
  pedantic?: boolean;
  query?: string;
  recurse?: boolean;
  readme?: string;
  template?: string;
  tutorials?: string;
}

export interface JsDocEntry {
  // 注释本身，包含 /** */。可能为空串
  comment?: string;
  // 元数据
  meta?: Meta;
  // 从注释中提取出的描述
  description?: string;
  // 被注释对象的名字
  name?: string;
  // 被注释对象的全名，包含所属范围
  longname: string;
  // 被注释对象的类型
  kind: Kind;
  // 被注释对象的作用域
  scope?: Scope;
  // 是否未文档化，如果没有文档就为 true，否则为 undefined
  undocumented?: boolean;
  // 所属对象
  memberof?: string;
  // @param 参数注释
  params?: any[];
  // 所属文件名，用于 King.Package
  files?: string[];
}

export enum Kind {
  // 类
  Class = 'class',
  // 函数/方法
  Function = 'function',
  // 变量/属性
  Member = 'member',
  // 包
  Package = 'package',
}

export interface Meta {
  // 文字偏移范围
  range: number[];
  // 所属文件名（不含路径）
  filename: string;
  // 起始行号
  lineno: number;
  // 起始列号
  columnno: number;
  // 所属文件路径
  path: string;
  // 代码信息
  code: Code;
  // 局部变量。
  // isHtmlLabel~state 表示 isHtmlLabel 内的局部变量 state
  // this.previewColor 表示 this 的成员变量
  vars?: { [key: string]: null | string };
}

export interface Code {
  // 节点唯一标识
  id: string;
  // 节点名称，包含所属对象
  name: string;
  // 类型
  type?: Type;
  // 函数的参数名
  paramnames?: string[];
  // 属性值
  value?: boolean | number | null | string;
  // 局部变量所属的函数全名
  funcscope?: string;
}

export enum Type {
  // 数组
  ArrayExpression = 'ArrayExpression',
  // 赋值表达式（局部变量）
  AssignmentExpression = 'AssignmentExpression',
  // 二元表达式
  BinaryExpression = 'BinaryExpression',
  // 函数调用
  CallExpression = 'CallExpression',
  // 条件表达式（三目）
  ConditionalExpression = 'ConditionalExpression',
  // 普通函数声明
  FunctionDeclaration = 'FunctionDeclaration',
  // 函数表达式式声明（匿名函数赋值）
  FunctionExpression = 'FunctionExpression',
  // 对属性赋值
  Identifier = 'Identifier',
  // 字面量赋值
  Literal = 'Literal',
  // 逻辑表达式
  LogicalExpression = 'LogicalExpression',
  // 成员表达式，用于声明哈希对象
  MemberExpression = 'MemberExpression',
  // new 表达式
  NewExpression = 'NewExpression',
  // 一元表达式
  UnaryExpression = 'UnaryExpression',
}

export enum Scope {
  // 全局变量
  Global = 'global',
  // 局部变量
  Inner = 'inner',
  // 成员变量
  Instance = 'instance',
  // 静态变量
  Static = 'static',
}


export function explainSync(options: JsDocOptions): JsDocEntry[];
