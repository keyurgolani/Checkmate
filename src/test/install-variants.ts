/**
 * Reads the schema of each install variant for the adapter tests (#29):
 * pb_schema.json as JSON, and the two setup scripts with the TypeScript
 * parser. The scripts connect to PocketBase when imported, so they are only
 * ever parsed.
 *
 * A collection definition is an object literal with a string `name` and a
 * `schema` or `fields` array of field objects. An object with such an array
 * and no `name` adds fields to the last collection defined before it in the
 * same block, the way create-collections.ts adds the `parent` self-relations.
 * Every variant gets PocketBase's built-in `users` collection, and every
 * collection gets `ROW_FIELDS` from storage.ts, whose comment says where each
 * installer's autodates come from.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { INSTALL_VARIANT_SOURCES, ROW_FIELDS, type InstallVariant } from '@/lib/domain/storage';
import { REPO_ROOT } from './source-files';

export interface VariantField {
  readonly name: string;
  readonly type: string;
  /** A select field's values, in declared order. */
  readonly values?: readonly string[];
}

/** Collection name to its fields by name. */
export type VariantSchema = ReadonlyMap<string, ReadonlyMap<string, VariantField>>;

type MutableSchema = Map<string, Map<string, VariantField>>;

function withRowFields(schema: MutableSchema): VariantSchema {
  if (!schema.has('users')) schema.set('users', new Map());
  for (const fields of schema.values()) {
    for (const name of ROW_FIELDS) if (!fields.has(name)) fields.set(name, { name, type: name === 'id' ? 'text' : 'autodate' });
  }
  return schema;
}

interface JsonField {
  readonly name: string;
  readonly type: string;
  readonly values?: readonly string[];
  readonly options?: { readonly values?: readonly string[] };
}

interface JsonCollection {
  readonly name: string;
  readonly schema?: readonly JsonField[];
  readonly fields?: readonly JsonField[];
}

function fromJson(text: string): VariantSchema {
  const schema: MutableSchema = new Map();
  for (const collection of JSON.parse(text) as JsonCollection[]) {
    const fields = new Map<string, VariantField>();
    for (const field of collection.schema ?? collection.fields ?? []) {
      const values = field.values ?? field.options?.values;
      fields.set(field.name, values ? { name: field.name, type: field.type, values } : { name: field.name, type: field.type });
    }
    schema.set(collection.name, fields);
  }
  return withRowFields(schema);
}

function property(object: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  for (const element of object.properties) {
    if (ts.isPropertyAssignment(element) && (ts.isIdentifier(element.name) || ts.isStringLiteral(element.name)) && element.name.text === name) {
      return element.initializer;
    }
  }
  return undefined;
}

function stringProperty(object: ts.ObjectLiteralExpression, name: string): string | undefined {
  const value = property(object, name);
  return value && ts.isStringLiteralLike(value) ? value.text : undefined;
}

function strings(value: ts.Expression | undefined): readonly string[] | undefined {
  if (!value || !ts.isArrayLiteralExpression(value)) return undefined;
  return value.elements.filter(ts.isStringLiteralLike).map((element) => element.text);
}

function fieldList(object: ts.ObjectLiteralExpression): ts.ArrayLiteralExpression | undefined {
  const list = property(object, 'schema') ?? property(object, 'fields');
  return list && ts.isArrayLiteralExpression(list) ? list : undefined;
}

function readField(object: ts.ObjectLiteralExpression): VariantField | undefined {
  const name = stringProperty(object, 'name');
  const type = stringProperty(object, 'type');
  if (!name || !type) return undefined;
  const options = property(object, 'options');
  const values = strings(property(object, 'values')) ?? (options && ts.isObjectLiteralExpression(options) ? strings(property(options, 'values')) : undefined);
  return values ? { name, type, values } : { name, type };
}

function enclosingBlock(node: ts.Node): ts.Node {
  let current = node.parent;
  while (current && !ts.isBlock(current) && !ts.isSourceFile(current)) current = current.parent;
  return current ?? node.getSourceFile();
}

function fromScript(file: string, text: string): VariantSchema {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const schema: MutableSchema = new Map();
  const defined: Array<{ readonly block: ts.Node; readonly position: number; readonly name: string }> = [];

  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const list = fieldList(node);
      if (list) {
        const fields = list.elements.filter(ts.isObjectLiteralExpression).map(readField).filter((field) => field !== undefined);
        const name = stringProperty(node, 'name');
        const block = enclosingBlock(node);
        const target = name ?? defined.filter((entry) => entry.block === block && entry.position < node.pos).at(-1)?.name;
        if (name) defined.push({ block, position: node.pos, name });
        if (target) {
          const existing = schema.get(target) ?? new Map<string, VariantField>();
          for (const field of fields) existing.set(field.name, field);
          schema.set(target, existing);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return withRowFields(schema);
}

/** The schema an install variant creates. */
export function readInstallVariant(variant: InstallVariant): VariantSchema {
  const file = INSTALL_VARIANT_SOURCES[variant];
  const text = readFileSync(path.join(REPO_ROOT, file), 'utf8');
  return file.endsWith('.json') ? fromJson(text) : fromScript(file, text);
}
