/**
 * Evaluates the GitHub Actions expression subset used in job `if:` keys:
 * literals, context properties, ! < <= > >= == != && ||, parentheses, and
 * the functions startsWith, endsWith, contains, success, failure,
 * cancelled and always. Semantics follow GitHub: string comparison ignores
 * case, mismatched types compare as numbers, and an `if:` without a status
 * function is implicitly `success() && (...)`.
 */

const STATUS_FUNCTIONS = new Set(['success', 'failure', 'cancelled', 'always']);

/** @typedef {{ type: string, [key: string]: unknown }} Node */

/** Strips `${{ }}` from a whole-string expression. */
export function unwrap(source) {
  const text = String(source).trim();
  const match = /^\$\{\{([\s\S]*)\}\}$/.exec(text);
  return (match ? match[1] : text).trim();
}

/** Evaluates a job `if:` to a boolean, adding the implicit success() check. */
export function evaluateJobIf(source, context) {
  const ast = parse(unwrap(source));
  const value = evaluate(ast, context);
  const guarded = usesStatusFunction(ast) ? value : callStatus('success', context) && value;
  return truthy(guarded);
}

export function parse(source) {
  const tokens = tokenize(source);
  let position = 0;

  const peek = () => tokens[position];
  const next = () => tokens[position++];
  const expect = (type, value) => {
    const token = next();
    if (!token || token.type !== type || (value !== undefined && token.value !== value)) {
      throw new SyntaxError(`expected ${value ?? type} in: ${source}`);
    }
    return token;
  };
  const isOperator = (...values) => peek()?.type === 'op' && values.includes(peek().value);

  const binary = (operand, ...operators) => () => {
    let left = operand();
    while (isOperator(...operators)) {
      const operator = next().value;
      left = { type: 'binary', operator, left, right: operand() };
    }
    return left;
  };

  const primary = () => {
    const token = next();
    if (!token) throw new SyntaxError(`unexpected end of: ${source}`);
    if (token.type === 'string' || token.type === 'number') return { type: 'literal', value: token.value };
    if (token.type === 'op' && token.value === '(') {
      const inner = or();
      expect('op', ')');
      return inner;
    }
    if (token.type !== 'ident') throw new SyntaxError(`unexpected ${token.value} in: ${source}`);
    if (token.value === 'true' || token.value === 'false') return { type: 'literal', value: token.value === 'true' };
    if (token.value === 'null') return { type: 'literal', value: null };
    if (isOperator('(')) {
      next();
      const args = [];
      while (!isOperator(')')) {
        args.push(or());
        if (isOperator(',')) next();
        else break;
      }
      expect('op', ')');
      return { type: 'call', name: token.value.toLowerCase(), args };
    }
    let node = { type: 'context', name: token.value };
    while (isOperator('.', '[')) {
      if (next().value === '.') {
        // `.*` is an object filter, e.g. `github.event.commits.*.message`.
        const key = isOperator('*') ? (next(), { type: 'wildcard' }) : { type: 'literal', value: expect('ident').value };
        node = { type: 'property', object: node, key };
      } else {
        const key = or();
        expect('op', ']');
        node = { type: 'property', object: node, key };
      }
    }
    return node;
  };

  const unary = () => {
    if (isOperator('!')) {
      next();
      return { type: 'not', operand: unary() };
    }
    return primary();
  };
  const comparison = binary(unary, '<', '<=', '>', '>=');
  const equality = binary(comparison, '==', '!=');
  const and = binary(equality, '&&');
  const or = binary(and, '||');

  const ast = or();
  if (position !== tokens.length) throw new SyntaxError(`unexpected ${peek().value} in: ${source}`);
  return ast;
}

export function evaluate(node, context) {
  switch (node.type) {
    case 'literal':
      return node.value;
    case 'context':
      return lookup(context, node.name);
    case 'property':
      if (node.key.type === 'wildcard') throw new SyntaxError('object filters (.*) are not supported here');
      return lookup(evaluate(node.object, context), evaluate(node.key, context));
    case 'not':
      return !truthy(evaluate(node.operand, context));
    case 'call':
      return call(node, context);
    case 'binary': {
      if (node.operator === '&&') {
        const left = evaluate(node.left, context);
        return truthy(left) ? evaluate(node.right, context) : left;
      }
      if (node.operator === '||') {
        const left = evaluate(node.left, context);
        return truthy(left) ? left : evaluate(node.right, context);
      }
      const left = evaluate(node.left, context);
      const right = evaluate(node.right, context);
      if (node.operator === '==') return looseEquals(left, right);
      if (node.operator === '!=') return !looseEquals(left, right);
      return compare(node.operator, left, right);
    }
    default:
      throw new Error(`unknown node ${node.type}`);
  }
}

function call(node, context) {
  if (STATUS_FUNCTIONS.has(node.name)) {
    if (node.args.length > 0) throw new SyntaxError(`${node.name}() takes no arguments`);
    return callStatus(node.name, context);
  }
  const args = node.args.map((arg) => evaluate(arg, context));
  if (node.name === 'startswith') return text(args[0]).toLowerCase().startsWith(text(args[1]).toLowerCase());
  if (node.name === 'endswith') return text(args[0]).toLowerCase().endsWith(text(args[1]).toLowerCase());
  if (node.name === 'contains') {
    if (Array.isArray(args[0])) return args[0].some((item) => looseEquals(item, args[1]));
    return text(args[0]).toLowerCase().includes(text(args[1]).toLowerCase());
  }
  throw new SyntaxError(`unsupported function ${node.name}()`);
}

function callStatus(name, context) {
  const status = context.status?.[name];
  if (typeof status !== 'function') throw new Error(`no ${name}() in the evaluation context`);
  return status();
}

function usesStatusFunction(node) {
  if (node.type === 'call' && STATUS_FUNCTIONS.has(node.name)) return true;
  return Object.values(node).some((child) => {
    if (Array.isArray(child)) return child.some((item) => item && typeof item === 'object' && usesStatusFunction(item));
    return child !== null && typeof child === 'object' && 'type' in child && usesStatusFunction(child);
  });
}

/** Context keys are case-insensitive; a missing key is null. */
function lookup(object, key) {
  if (object === null || typeof object !== 'object') return null;
  const wanted = String(key).toLowerCase();
  const match = Object.keys(object).find((candidate) => candidate.toLowerCase() === wanted);
  return match === undefined ? null : object[match];
}

export function truthy(value) {
  return !(value === false || value === null || value === undefined || value === '' || value === 0 || Number.isNaN(value));
}

function looseEquals(left, right) {
  if (typeof left === 'string' && typeof right === 'string') return left.toLowerCase() === right.toLowerCase();
  if ((left === null || left === undefined) && (right === null || right === undefined)) return true;
  if (typeof left === typeof right && typeof left !== 'object') return left === right;
  return toNumber(left) === toNumber(right);
}

function compare(operator, left, right) {
  const bothStrings = typeof left === 'string' && typeof right === 'string';
  const a = bothStrings ? left.toLowerCase() : toNumber(left);
  const b = bothStrings ? right.toLowerCase() : toNumber(right);
  if (operator === '<') return a < b;
  if (operator === '<=') return a <= b;
  if (operator === '>') return a > b;
  return a >= b;
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value.trim() === '' ? 0 : Number(value);
  return Number.NaN;
}

function text(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function tokenize(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    const space = /^\s+/.exec(rest);
    if (space) {
      index += space[0].length;
      continue;
    }
    const operator = /^(==|!=|<=|>=|&&|\|\||[!<>()[\].,*])/.exec(rest);
    if (operator) {
      tokens.push({ type: 'op', value: operator[0] });
      index += operator[0].length;
      continue;
    }
    if (rest[0] === "'") {
      let value = '';
      let cursor = 1;
      for (;;) {
        if (cursor >= rest.length) throw new SyntaxError(`unterminated string in: ${source}`);
        if (rest[cursor] === "'") {
          if (rest[cursor + 1] === "'") {
            value += "'";
            cursor += 2;
            continue;
          }
          break;
        }
        value += rest[cursor];
        cursor += 1;
      }
      tokens.push({ type: 'string', value });
      index += cursor + 1;
      continue;
    }
    const number = /^-?(0x[0-9a-f]+|\d+(\.\d+)?(e[+-]?\d+)?)/i.exec(rest);
    if (number) {
      tokens.push({ type: 'number', value: Number(number[0]) });
      index += number[0].length;
      continue;
    }
    const identifier = /^[A-Za-z_][\w-]*/.exec(rest);
    if (identifier) {
      tokens.push({ type: 'ident', value: identifier[0] });
      index += identifier[0].length;
      continue;
    }
    throw new SyntaxError(`unexpected character ${rest[0]} in: ${source}`);
  }
  return tokens;
}
