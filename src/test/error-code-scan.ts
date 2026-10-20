/**
 * Source scan for CHECKMATE-01.2 · envelope (#30), test plan item 7.
 *
 * Reads non-test files under src/ with the TypeScript checker, so a code
 * written as `TemplateErrorCodes.NOT_FOUND`, a same-file constant, or a
 * forwarded `result.error.code` resolves to its value or value union. Each
 * service types its error `code` as its `*ErrorCodes` union for this. It
 * finds:
 * - members of every `*ErrorCodes` object, and literal error codes: a `code`
 *   property or `apiError` argument with a fixed string value;
 * - every response that sends a code, with the handler's HTTP method and the
 *   status each code goes out with: `apiError`, `NextResponse.json` and
 *   `Response.json` bodies, the auth-cookie JSON helpers, and `withAuth` and
 *   `withPublicAccess` options. A status is a literal, a constant, or a call
 *   to a status function whose switch maps codes, `default:` arms, braced
 *   clauses and fall-through included;
 * - responses in route files or the proxy whose codes or status it can't
 *   pin down, so a new forwarding path fails until it's typed;
 * - codes passed to the error-envelope.ts helpers;
 * - codeless error bodies under src/app: route response bodies and server
 *   action return values whose `error` or `errors` carry no `code`, or that
 *   say `success: false` with no error at all.
 * Bodies built in a variable before the response call are read through
 * their type, not their literal.
 */

import path from 'node:path';
import ts from 'typescript';
import { REPO_ROOT, sourceFiles } from './source-files';

export { REPO_ROOT, sourceFiles };

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const HTTP_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const RESPONSE_CLASSES = new Set(['NextResponse', 'Response']);
// JSON response helpers in src/lib/auth-cookies.ts: body argument, status argument.
const RESPONSE_HELPERS: ReadonlyMap<string, { body: number; status: number }> = new Map([
  ['jsonResponseWithAuth', { body: 0, status: 2 }],
  ['jsonResponseWithLogout', { body: 0, status: 1 }],
]);
const ENVELOPE_HELPERS = new Set(['errorResponse', 'errorEnvelope', 'outcomeResponse', 'outcomeBody']);

/** Outside a route handler, a send is keyed to any method. */
export const ANY_METHOD = '*';

export interface CodeSite {
  readonly code: string;
  readonly file: string;
  readonly line: number;
}

export interface SentCode extends CodeSite {
  readonly status: number;
  readonly method: string;
  readonly via: 'apiError' | 'json body' | 'json helper' | 'withAuth' | 'withPublicAccess';
}

export interface FileLine {
  readonly file: string;
  readonly line: number;
  readonly reason: string;
}

export interface ErrorCodeScan {
  readonly files: readonly string[];
  readonly members: readonly CodeSite[];
  readonly literals: readonly CodeSite[];
  readonly sent: readonly SentCode[];
  readonly unresolved: readonly FileLine[];
  readonly envelope: readonly CodeSite[];
  readonly codeless: readonly FileLine[];
}

export interface ScanOptions {
  /** Scan these repo-relative files with these contents instead of src/. */
  readonly sources?: Readonly<Record<string, string>>;
}

function compilerOptions(): ts.CompilerOptions {
  const configFile = ts.readConfigFile(path.join(REPO_ROOT, 'tsconfig.json'), ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, REPO_ROOT);
  return { ...options, noEmit: true, incremental: false, skipLibCheck: true };
}

function createProgram(files: readonly string[], sources?: Readonly<Record<string, string>>): ts.Program {
  const options = compilerOptions();
  const rootNames = files.map((file) => path.join(REPO_ROOT, file));
  if (!sources) return ts.createProgram({ rootNames, options });

  const virtual = new Map(Object.entries(sources).map(([file, text]) => [path.join(REPO_ROOT, file), text]));
  const host = ts.createCompilerHost(options);
  const { getSourceFile, fileExists, readFile } = host;
  host.getSourceFile = (fileName, language, ...rest) => {
    const text = virtual.get(fileName);
    return text === undefined ? getSourceFile(fileName, language, ...rest) : ts.createSourceFile(fileName, text, language);
  };
  host.fileExists = (fileName) => virtual.has(fileName) || fileExists(fileName);
  host.readFile = (fileName) => virtual.get(fileName) ?? readFile(fileName);
  return ts.createProgram({ rootNames, options, host });
}

function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isAwaitExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyName(property: ts.ObjectLiteralElementLike): string | undefined {
  const name = property.name;
  if (name && (ts.isIdentifier(name) || ts.isStringLiteral(name))) return name.text;
  return undefined;
}

function findProperty(object: ts.ObjectLiteralExpression, name: string): ts.ObjectLiteralElementLike | undefined {
  return object.properties.find((property) => propertyName(property) === name);
}

function valueNode(property: ts.ObjectLiteralElementLike): ts.Expression | ts.Identifier | undefined {
  if (ts.isPropertyAssignment(property)) return property.initializer;
  if (ts.isShorthandPropertyAssignment(property)) return property.name;
  return undefined;
}

function calleeName(call: ts.CallExpression | ts.NewExpression): string | undefined {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    return `${callee.expression.text}.${callee.name.text}`;
  }
  return undefined;
}

function isResponseJsonCall(node: ts.CallExpression): boolean {
  const [object, method] = (calleeName(node) ?? '').split('.');
  return method === 'json' && object !== undefined && RESPONSE_CLASSES.has(object);
}

/** The body of `new NextResponse(JSON.stringify(body))` or `new Response(...)`. */
function stringifiedBody(node: ts.NewExpression): ts.Expression | undefined {
  if (!ts.isIdentifier(node.expression) || !RESPONSE_CLASSES.has(node.expression.text)) return undefined;
  const first = node.arguments?.[0];
  if (!first || !ts.isCallExpression(first) || calleeName(first) !== 'JSON.stringify') return undefined;
  return first.arguments[0];
}

/** Each object literal an expression can evaluate to, through parentheses and conditionals. */
function objectLiterals(node: ts.Expression): ts.ObjectLiteralExpression[] {
  const expression = unwrap(node);
  if (ts.isObjectLiteralExpression(expression)) return [expression];
  if (ts.isConditionalExpression(expression)) {
    return [...objectLiterals(expression.whenTrue), ...objectLiterals(expression.whenFalse)];
  }
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
    return [...objectLiterals(expression.left), ...objectLiterals(expression.right)];
  }
  return [];
}

/** An object literal and every object literal nested in its values. */
function nestedObjectLiterals(object: ts.ObjectLiteralExpression): ts.ObjectLiteralExpression[] {
  const found: ts.ObjectLiteralExpression[] = [object];
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const value = unwrap(property.initializer);
    const elements = ts.isArrayLiteralExpression(value) ? value.elements : [value];
    for (const element of elements) {
      for (const literal of objectLiterals(element)) found.push(...nestedObjectLiterals(literal));
    }
  }
  return found;
}

/** The codes a value of this type can be; `complete` is false when one constituent isn't a fixed string. */
interface Codes {
  readonly codes: readonly string[];
  readonly complete: boolean;
}

function codesOfType(checker: ts.TypeChecker, type: ts.Type): Codes {
  const value = checker.getNonNullableType(type);
  const parts = value.isUnion() ? value.types : [value];
  const codes: string[] = [];
  let complete = true;
  for (const part of parts) {
    if (part.isStringLiteral()) {
      if (CODE_PATTERN.test(part.value)) codes.push(part.value);
    } else {
      complete = false;
    }
  }
  return { codes, complete };
}

function codesAt(checker: ts.TypeChecker, node: ts.Node): Codes {
  return codesOfType(checker, checker.getTypeAtLocation(node));
}

function propertyType(checker: ts.TypeChecker, type: ts.Type, name: string, at: ts.Node): ts.Type | undefined {
  const symbol = checker.getNonNullableType(type).getProperty(name);
  return symbol && checker.getTypeOfSymbolAtLocation(symbol, at);
}

/** Codes in a value's type: each `error.code` it can hold, down to three levels. */
function codesInType(checker: ts.TypeChecker, type: ts.Type, at: ts.Node, depth = 3): Codes[] {
  const value = checker.getNonNullableType(type);
  if (value.isUnion()) return value.types.flatMap((member) => codesInType(checker, member, at, depth));
  if (depth === 0 || !(value.flags & ts.TypeFlags.Object) || value.getCallSignatures().length > 0) return [];
  const found: Codes[] = [];
  for (const symbol of value.getProperties()) {
    const member = checker.getTypeOfSymbolAtLocation(symbol, at);
    if (symbol.name === 'error') {
      const code = propertyType(checker, member, 'code', at);
      if (code) found.push(codesOfType(checker, code));
    } else {
      found.push(...codesInType(checker, member, at, depth - 1));
    }
  }
  return found;
}

/** Codes a response body sends: literal `error.code` values, forwarded errors, and typed bodies. */
function codesInBody(checker: ts.TypeChecker, body: ts.Expression): Codes[] {
  const expression = unwrap(body);
  const literals = objectLiterals(expression);
  if (literals.length === 0) return codesInType(checker, checker.getTypeAtLocation(expression), expression);

  const found: Codes[] = [];
  for (const object of literals.flatMap(nestedObjectLiterals)) {
    const error = findProperty(object, 'error');
    const value = error && valueNode(error);
    if (!value) continue;
    const errorLiterals = ts.isIdentifier(value) ? [] : objectLiterals(value);
    if (errorLiterals.length > 0) {
      for (const literal of errorLiterals) {
        const code = findProperty(literal, 'code');
        const node = code && valueNode(code);
        if (node) found.push(codesAt(checker, node));
      }
    } else {
      const code = propertyType(checker, checker.getTypeAtLocation(value), 'code', value);
      if (code) found.push(codesOfType(checker, code));
    }
  }
  return found;
}

/** How a status expression picks a status: one for every code, or one per code. */
interface StatusRule {
  readonly fixed?: number;
  readonly byCode?: ReadonlyMap<string, number>;
  readonly otherwise?: number;
}

function numberValue(checker: ts.TypeChecker, node: ts.Node): number | undefined {
  const type = checker.getTypeAtLocation(node);
  return type.isNumberLiteral() ? type.value : undefined;
}

/** The status the first return in these statements gives, looking into braced blocks. */
function returnedStatus(checker: ts.TypeChecker, statements: readonly ts.Statement[]): number | undefined {
  for (const statement of statements) {
    if (ts.isReturnStatement(statement)) return statement.expression && numberValue(checker, statement.expression);
    if (ts.isBlock(statement)) return returnedStatus(checker, statement.statements);
  }
  return undefined;
}

/** A status function: `function f(code) { switch (code) { case X: return 400; default: return 500; } }`. */
function statusFunctionRule(checker: ts.TypeChecker, fn: ts.FunctionLikeDeclaration): StatusRule | undefined {
  const body = fn.body;
  const parameter = fn.parameters[0];
  if (!body || !ts.isBlock(body) || !parameter || !ts.isIdentifier(parameter.name)) return undefined;
  const switchIndex = body.statements.findIndex(ts.isSwitchStatement);
  const statement = body.statements[switchIndex];
  if (!statement || !ts.isSwitchStatement(statement)) return undefined;
  const subject = unwrap(statement.expression);
  if (!ts.isIdentifier(subject) || subject.text !== parameter.name.text) return undefined;

  const byCode = new Map<string, number>();
  let otherwise: number | undefined;
  let pending: string[] = [];
  let pendingDefault = false;
  for (const clause of statement.caseBlock.clauses) {
    if (ts.isDefaultClause(clause)) pendingDefault = true;
    else pending.push(...codesAt(checker, clause.expression).codes);
    if (clause.statements.length === 0) continue;
    const status = returnedStatus(checker, clause.statements);
    if (status === undefined) return undefined;
    for (const code of pending) if (!byCode.has(code)) byCode.set(code, status);
    if (pendingDefault) otherwise = status;
    pending = [];
    pendingDefault = false;
  }
  if (pending.length > 0 || pendingDefault) return undefined;
  if (otherwise === undefined) otherwise = returnedStatus(checker, body.statements.slice(switchIndex + 1));
  return { byCode, otherwise };
}

function declarationOf(checker: ts.TypeChecker, node: ts.Node): ts.Declaration | undefined {
  let symbol = checker.getSymbolAtLocation(node);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return symbol?.valueDeclaration ?? symbol?.declarations?.[0];
}

function statusRule(checker: ts.TypeChecker, node: ts.Expression, depth = 3): StatusRule | undefined {
  const fixed = numberValue(checker, node);
  if (fixed !== undefined) return { fixed };
  if (depth === 0) return undefined;
  const expression = unwrap(node);
  if (ts.isIdentifier(expression)) {
    const declaration = declarationOf(checker, expression);
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) {
      return statusRule(checker, declaration.initializer, depth - 1);
    }
    return undefined;
  }
  if (ts.isCallExpression(expression)) {
    const declaration = declarationOf(checker, expression.expression);
    if (declaration && ts.isFunctionDeclaration(declaration)) return statusFunctionRule(checker, declaration);
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) {
      const init = unwrap(declaration.initializer);
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return statusFunctionRule(checker, init);
    }
  }
  return undefined;
}

/** The status rule of a response init: 200 when absent. */
function initRule(checker: ts.TypeChecker, init: ts.Expression | undefined): StatusRule | undefined {
  if (!init) return { fixed: 200 };
  const object = unwrap(init);
  if (!ts.isObjectLiteralExpression(object)) return undefined;
  const status = findProperty(object, 'status');
  if (!status) return { fixed: 200 };
  const value = valueNode(status);
  return value ? statusRule(checker, value) : undefined;
}

function isStringLike(type: ts.Type): boolean {
  if (type.isUnion()) return type.types.every(isStringLike);
  return (type.flags & ts.TypeFlags.StringLike) !== 0;
}

/** True when every value of the type is an object with a string `code`. */
function hasCode(checker: ts.TypeChecker, type: ts.Type, at: ts.Node): boolean {
  const value = checker.getNonNullableType(type);
  if (value.isUnion()) return value.types.every((member) => hasCode(checker, member, at));
  if (value.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never)) return false;
  const code = value.getProperty('code');
  if (!code) return false;
  return isStringLike(checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(code, at)));
}

/** Why an object literal is an error body without a code, or undefined. */
function codelessReason(checker: ts.TypeChecker, object: ts.ObjectLiteralExpression): string | undefined {
  const error = findProperty(object, 'error');
  if (error) {
    const node = valueNode(error);
    if (!node) return 'error is not a plain value';
    return hasCode(checker, checker.getTypeAtLocation(node), node) ? undefined : 'error has no code';
  }
  const errors = findProperty(object, 'errors');
  if (errors) {
    const node = valueNode(errors);
    if (!node) return 'errors is not a plain value';
    const list = checker.getNonNullableType(checker.getTypeAtLocation(node));
    const element = checker.getIndexTypeOfType(list, ts.IndexKind.Number);
    return element && hasCode(checker, element, node) ? undefined : 'errors have no code';
  }
  const success = findProperty(object, 'success');
  if (success && ts.isPropertyAssignment(success) && success.initializer.kind === ts.SyntaxKind.FalseKeyword) {
    return 'success: false with no error';
  }
  return undefined;
}

function hasUseServer(statements: ts.NodeArray<ts.Statement>): boolean {
  for (const statement of statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) return false;
    if (statement.expression.text === 'use server') return true;
  }
  return false;
}

/** The values a function returns, without descending into nested functions. */
function returnedExpressions(fn: ts.FunctionLikeDeclaration): ts.Expression[] {
  const body = fn.body;
  if (!body) return [];
  if (!ts.isBlock(body)) return [body];
  const found: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) found.push(node.expression);
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(body, visit);
  return found;
}

/** Functions a server action module declares at its top level. */
function serverActions(source: ts.SourceFile): ts.FunctionLikeDeclaration[] {
  const actions: ts.FunctionLikeDeclaration[] = [];
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement)) actions.push(statement);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const init = declaration.initializer && unwrap(declaration.initializer);
        if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) actions.push(init);
      }
    }
  }
  return actions;
}

function inlineServerActions(source: ts.SourceFile): ts.FunctionLikeDeclaration[] {
  const actions: ts.FunctionLikeDeclaration[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node)) &&
      node.body &&
      ts.isBlock(node.body) &&
      hasUseServer(node.body.statements)
    ) {
      actions.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return actions;
}

function isRouteFile(file: string): boolean {
  return /^src\/app\/.*\/route\.tsx?$/.test(file);
}

function isExported(statement: ts.FunctionDeclaration | ts.VariableStatement): boolean {
  return (ts.getModifiers(statement) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

/** The HTTP method of the route handler a node sits in, or ANY_METHOD. */
function methodOf(node: ts.Node, route: boolean): string {
  if (!route) return ANY_METHOD;
  let top: ts.Node = node;
  while (top.parent && !ts.isSourceFile(top.parent)) top = top.parent;
  if (ts.isFunctionDeclaration(top) && isExported(top) && top.name && HTTP_METHODS.has(top.name.text)) {
    return top.name.text;
  }
  if (ts.isVariableStatement(top) && isExported(top)) {
    for (const declaration of top.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && HTTP_METHODS.has(declaration.name.text)) return declaration.name.text;
    }
  }
  return ANY_METHOD;
}

export function scanErrorCodes(options: ScanOptions = {}): ErrorCodeScan {
  const files = options.sources ? Object.keys(options.sources).sort() : sourceFiles();
  const program = createProgram(files, options.sources);
  const checker = program.getTypeChecker();

  const members: CodeSite[] = [];
  const literals: CodeSite[] = [];
  const sent: SentCode[] = [];
  const unresolved: FileLine[] = [];
  const envelope: CodeSite[] = [];
  const codeless: FileLine[] = [];

  for (const file of files) {
    const source = program.getSourceFile(path.join(REPO_ROOT, file));
    if (!source) throw new Error(`TypeScript did not load ${file}`);
    const lineOf = (node: ts.Node): number => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    const route = isRouteFile(file);
    const returning = route || file === 'src/proxy.ts';
    const responseBodies: ts.Expression[] = [];

    const addSent = (at: ts.Node, codes: Codes[], rule: StatusRule | undefined, via: SentCode['via']): void => {
      const line = lineOf(at);
      const method = methodOf(at, route);
      for (const { codes: values, complete } of codes) {
        if (!complete && returning) unresolved.push({ file, line, reason: 'code is not a fixed set of values' });
        for (const code of values) {
          const status = rule?.fixed ?? rule?.byCode?.get(code) ?? rule?.otherwise;
          if (status === undefined) {
            if (returning) unresolved.push({ file, line, reason: `no fixed status for ${code}` });
            continue;
          }
          sent.push({ code, status, method, file, line, via });
        }
      }
    };

    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /ErrorCodes$/.test(node.name.text)) {
        const init = node.initializer && unwrap(node.initializer);
        if (init && ts.isObjectLiteralExpression(init)) {
          for (const property of init.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            const value = unwrap(property.initializer);
            if (ts.isStringLiteral(value)) members.push({ code: value.text, file, line: lineOf(property) });
          }
        }
      }

      if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && propertyName(node) === 'code') {
        const value = valueNode(node);
        if (value && !ts.isIdentifier(value) && ts.isStringLiteral(unwrap(value))) {
          literals.push({ code: (unwrap(value) as ts.StringLiteral).text, file, line: lineOf(node) });
        } else if (value && ts.isIdentifier(value)) {
          const declaration = declarationOf(checker, value);
          const init = declaration && ts.isVariableDeclaration(declaration) && declaration.initializer;
          if (init && ts.isStringLiteral(unwrap(init))) literals.push({ code: (unwrap(init) as ts.StringLiteral).text, file, line: lineOf(node) });
        }
      }

      if (ts.isCallExpression(node)) {
        const name = calleeName(node);
        const [first, , third] = node.arguments;

        if (name === 'apiError' && first) {
          const codes = codesAt(checker, first);
          const argument = unwrap(first);
          if (ts.isStringLiteral(argument)) literals.push({ code: argument.text, file, line: lineOf(node) });
          if (ts.isIdentifier(argument)) {
            const declaration = declarationOf(checker, argument);
            const init = declaration && ts.isVariableDeclaration(declaration) && declaration.initializer;
            if (init && ts.isStringLiteral(unwrap(init))) literals.push({ code: (unwrap(init) as ts.StringLiteral).text, file, line: lineOf(node) });
          }
          addSent(node, [codes], third ? statusRule(checker, third) : undefined, 'apiError');
        }

        if (isResponseJsonCall(node) && first) {
          addSent(node, codesInBody(checker, first), initRule(checker, node.arguments[1]), 'json body');
          responseBodies.push(first);
        }

        const helper = name ? RESPONSE_HELPERS.get(name) : undefined;
        const helperBody = helper && node.arguments[helper.body];
        if (helper && helperBody) {
          const statusArgument = node.arguments[helper.status];
          addSent(node, codesInBody(checker, helperBody), statusArgument ? statusRule(checker, statusArgument) : { fixed: 200 }, 'json helper');
          responseBodies.push(helperBody);
        }

        const wrapper = name === 'withAuth' || name === 'withPublicAccess' ? name : undefined;
        if (wrapper && first) {
          const wrapperOptions = unwrap(first);
          if (ts.isObjectLiteralExpression(wrapperOptions)) {
            for (const [option, status] of [['unauthorizedCode', 401], ['unknownCode', 500]] as const) {
              const property = findProperty(wrapperOptions, option);
              const value = property && valueNode(property);
              if (property && value) addSent(property, [codesAt(checker, value)], { fixed: status }, wrapper);
            }
          }
        }

        if (name && ENVELOPE_HELPERS.has(name) && first && file !== 'src/lib/api/error-envelope.ts') {
          for (const code of codesAt(checker, first).codes) envelope.push({ code, file, line: lineOf(node) });
        }
      }

      if (ts.isNewExpression(node)) {
        const body = stringifiedBody(node);
        if (body) {
          addSent(node, codesInBody(checker, body), initRule(checker, node.arguments?.[1]), 'json body');
          responseBodies.push(body);
        }
      }

      ts.forEachChild(node, visit);
    };
    visit(source);

    if (!file.startsWith('src/app/')) continue;
    const actions = hasUseServer(source.statements) ? serverActions(source) : inlineServerActions(source);
    const bodies = [...responseBodies, ...actions.flatMap(returnedExpressions)];
    const seen = new Set<ts.ObjectLiteralExpression>();
    for (const object of bodies.flatMap(objectLiterals).flatMap(nestedObjectLiterals)) {
      if (seen.has(object)) continue;
      seen.add(object);
      const reason = codelessReason(checker, object);
      if (reason) codeless.push({ file, line: lineOf(object), reason });
    }
  }

  return { files, members, literals, sent, unresolved, envelope, codeless };
}
