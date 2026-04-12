/**
 * Shared PocketBase schema field builders.
 *
 * Used by both the runtime schema initialiser (services/schema-init.ts)
 * and the CLI schema importer (scripts/import-schema.ts) so the shape
 * of generated field definitions stays in lockstep.
 */

export function buildField(field: {
  name: string;
  type: string;
  required: boolean;
  options: Record<string, unknown>;
}): Record<string, unknown> {
  const fieldDef: Record<string, unknown> = {
    name: field.name,
    type: field.type,
    required: field.required,
    system: false,
    hidden: false,
    presentable: false,
  };

  if (field.type === 'relation') {
    fieldDef.collectionId = field.options.collectionId;
    fieldDef.cascadeDelete = field.options.cascadeDelete ?? false;
    fieldDef.minSelect = field.options.minSelect ?? null;
    fieldDef.maxSelect = field.options.maxSelect ?? 1;
    fieldDef.displayFields = field.options.displayFields ?? [];
  } else if (field.type === 'text') {
    fieldDef.min = field.options.min ?? 0;
    fieldDef.max = field.options.max ?? 0;
    fieldDef.pattern = field.options.pattern ?? '';
    fieldDef.autogeneratePattern = '';
    fieldDef.primaryKey = false;
  } else if (field.type === 'editor') {
    fieldDef.convertUrls = field.options.convertUrls ?? false;
  } else if (field.type === 'select') {
    fieldDef.maxSelect = field.options.maxSelect ?? 1;
    fieldDef.values = field.options.values ?? [];
  } else if (field.type === 'json') {
    fieldDef.maxSize = field.options.maxSize ?? 0;
  } else if (field.type === 'number') {
    fieldDef.min = field.options.min ?? null;
    fieldDef.max = field.options.max ?? null;
    fieldDef.noDecimal = field.options.noDecimal ?? false;
  } else if (field.type === 'bool') {
    // No additional options needed
  } else if (field.type === 'date') {
    fieldDef.min = field.options.min ?? '';
    fieldDef.max = field.options.max ?? '';
  } else if (field.type === 'url') {
    fieldDef.exceptDomains = field.options.exceptDomains ?? [];
    fieldDef.onlyDomains = field.options.onlyDomains ?? [];
  } else if (field.type === 'autodate') {
    fieldDef.onCreate = field.options.onCreate ?? false;
    fieldDef.onUpdate = field.options.onUpdate ?? false;
  }

  return fieldDef;
}

export function buildAutodateFields(): Record<string, unknown>[] {
  return [
    {
      name: 'created',
      type: 'autodate',
      required: false,
      system: false,
      hidden: false,
      presentable: false,
      onCreate: true,
      onUpdate: false,
    },
    {
      name: 'updated',
      type: 'autodate',
      required: false,
      system: false,
      hidden: false,
      presentable: false,
      onCreate: true,
      onUpdate: true,
    },
  ];
}
