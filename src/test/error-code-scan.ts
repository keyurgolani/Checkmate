/**
 * Source scan for CHECKMATE-01.2 · envelope (#30), test plan item 7.
 *
 * Reads non-test files under src/ with the TypeScript checker, so a code
 * written as `TemplateErrorCodes.NOT_FOUND` or a same-file constant resolves
 * to its value. It finds:
 * - members of every `*ErrorCodes` object;
 * - literal error codes: a `code` property or `apiError` argument with a
 *   fixed string value;
 * - responses that pair a fixed code with a fixed status: `apiError`,
 *   `NextResponse.json` and `Response.json` bodies, `withAuth` and
 *   `withPublicAccess` options, and route status switches;
 * - codeless error bodies under src/app: route response bodies and server
 *   action return values whose `error` or `errors` carry no `code`, or that
 *   say `success: false` with no error at all.
 * Bodies built in a variable before the response call are not seen.
 */

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const RESPONSE_CLASSES = new Set(['NextResponse', 'Response']);
// The project's JSON response helpers (src/lib/auth-cookies.ts).
const RESPONSE_HELPERS = new Set(['jsonResponseWithAuth', 'jsonResponseWithLogout']);

export interface CodeSite {
  readonly code: string;
  readonly file: string;
  readonly line: number;
}

export interface SentCode extends CodeSite {
  readonly status: number;
  readonly via: 'apiError' | 'json body' | 'withAuth' | 'withPublicAccess' | 'status switch';
}

export interface CodelessBody {
  readonly file: string;
  readonly line: number;
  readonly reason: string;
}

export interface ErrorCodeScan {
  readonly files: readonly string[];
  readonly members: readonly CodeSite[];
  readonly literals: readonly CodeSite[];
  readonly sent: readonly SentCode[];
  readonly codeless: readonly CodelessBody[];
}

function isTestFile(file: string): boolean {
  return file.startsWith('src/test/') || /\.test\.tsx?$/.test(file) || file.endsWith('.d.ts');
}

/** Non-test .ts and .tsx files under src/, repo-relative with forward slashes. */
export function sourceFiles(): string[] {
  return readdirSync(path.join(REPO_ROOT, 'src'), { recursive: true, encoding: 'utf8' })
    .map((entry) => path.posix.join('src', entry.split(path.sep).join('/')))
    .filter((file) => /\.tsx?$/.test(file) && !isTestFile(file))
    .sort();
}

function createProgram(files: readonly string[]): ts.Program {
  const configFile = ts.readConfigFile(path.join(REPO_ROOT, 'tsconfig.json'), ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, REPO_ROOT);
  return ts.createProgram({
    rootNames: files.map((file) => path.join(REPO_ROOT, file)),
    options: { ...options, noEmit: true, incremental: false, skipLibCheck: true },
  });
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

function calleeName(call: ts.CallExpression | ts.NewExpression): string | undefined {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    return `${callee.expression.text}.${callee.name.text}`;
  }
  return undefined;
}

function isResponseJsonCall(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  const name = calleeName(node);
  if (!name) return false;
  const [object, method] = name.split('.');
  return method === 'json' && object !== undefined && RESPONSE_CLASSES.has(object);
}

/** The body of `new NextResponse(JSON.stringify(body))` or `new Response(...)`. */
function stringifiedBody(node: ts.Node): ts.Expression | undefined {
  if (!ts.isNewExpression(node) || !ts.isIdentifier(node.expression)) return undefined;
  if (!RESPONSE_CLASSES.has(node.expression.text)) return undefined;
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

function stringValues(checker: ts.TypeChecker, node: ts.Node): string[] {
  const type = checker.getTypeAtLocation(node);
  const parts = type.isUnion() ? type.types : [type];
  const values: string[] = [];
  for (const part of parts) {
    if (!part.isStringLiteral()) return [];
    values.push(part.value);
  }
  return values.filter((value) => CODE_PATTERN.test(value));
}

function numberValue(checker: ts.TypeChecker, node: ts.Node): number | undefined {
  const type = checker.getTypeAtLocation(node);
  return type.isNumberLiteral() ? type.value : undefined;
}

/** The status in a response init: 200 when absent, undefined when not fixed. */
function initStatus(checker: ts.TypeChecker, init: ts.Expression | undefined): number | undefined {
  if (!init) return 200;
  const object = unwrap(init);
  if (!ts.isObjectLiteralExpression(object)) return undefined;
  const status = findProperty(object, 'status');
  if (!status) return 200;
  if (!ts.isPropertyAssignment(status)) return undefined;
  return numberValue(checker, status.initializer);
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

function valueNode(property: ts.ObjectLiteralElementLike): ts.Node | undefined {
  if (ts.isPropertyAssignment(property)) return property.initializer;
  if (ts.isShorthandPropertyAssignment(property)) return property.name;
  return undefined;
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
    const element = checker.getIndexTypeOfType(checker.getNonNullableType(checker.getTypeAtLocation(node)), ts.IndexKind.Number);
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

/** Functions a server action module exports or declares at its top level. */
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

export function scanErrorCodes(): ErrorCodeScan {
  const files = sourceFiles();
  const program = createProgram(files);
  const checker = program.getTypeChecker();

  const members: CodeSite[] = [];
  const literals: CodeSite[] = [];
  const sent: SentCode[] = [];
  const codeless: CodelessBody[] = [];

  for (const file of files) {
    const source = program.getSourceFile(path.join(REPO_ROOT, file));
    if (!source) throw new Error(`TypeScript did not load ${file}`);
    const lineOf = (node: ts.Node): number => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    const route = isRouteFile(file);
    const responseBodies: ts.Expression[] = [];

    const addSent = (node: ts.Node, codes: string[], status: number | undefined, via: SentCode['via']): void => {
      if (status === undefined) return;
      for (const code of codes) sent.push({ code, status, file, line: lineOf(node), via });
    };

    const sentFromBody = (body: ts.Expression, status: number | undefined, at: ts.Node): void => {
      for (const object of objectLiterals(body).flatMap(nestedObjectLiterals)) {
        const error = findProperty(object, 'error');
        if (!error || !ts.isPropertyAssignment(error)) continue;
        const value = unwrap(error.initializer);
        if (!ts.isObjectLiteralExpression(value)) continue;
        const code = findProperty(value, 'code');
        const node = code && valueNode(code);
        if (node) addSent(at, stringValues(checker, node), status, 'json body');
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
        if (value) {
          for (const code of stringValues(checker, value)) literals.push({ code, file, line: lineOf(node) });
        }
      }

      if (ts.isCallExpression(node)) {
        const name = calleeName(node);
        const [first, , third] = node.arguments;

        if (name === 'apiError' && first) {
          const codes = stringValues(checker, first);
          for (const code of codes) literals.push({ code, file, line: lineOf(node) });
          if (third) addSent(node, codes, numberValue(checker, third), 'apiError');
        }

        if (isResponseJsonCall(node) && first) {
          sentFromBody(first, initStatus(checker, node.arguments[1]), node);
          responseBodies.push(first);
        }

        if (name && RESPONSE_HELPERS.has(name) && first) responseBodies.push(first);

        const wrapper = name === 'withAuth' || name === 'withPublicAccess' ? name : undefined;
        if (wrapper && first) {
          const options = unwrap(first);
          if (ts.isObjectLiteralExpression(options)) {
            for (const [option, status] of [['unauthorizedCode', 401], ['unknownCode', 500]] as const) {
              const property = findProperty(options, option);
              const value = property && valueNode(property);
              if (value) addSent(property, stringValues(checker, value), status, wrapper);
            }
          }
        }
      }

      const stringified = stringifiedBody(node);
      if (stringified && ts.isNewExpression(node)) {
        sentFromBody(stringified, initStatus(checker, node.arguments?.[1]), node);
        responseBodies.push(stringified);
      }

      if (route && ts.isSwitchStatement(node)) {
        let pending: string[] = [];
        for (const clause of node.caseBlock.clauses) {
          if (ts.isDefaultClause(clause)) {
            pending = [];
            continue;
          }
          pending.push(...stringValues(checker, clause.expression));
          if (clause.statements.length === 0) continue;
          const returned = clause.statements.find(ts.isReturnStatement);
          const status = returned?.expression && numberValue(checker, returned.expression);
          if (status !== undefined && status >= 100 && status <= 599) addSent(clause, pending, status, 'status switch');
          pending = [];
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

  return { files, members, literals, sent, codeless };
}
