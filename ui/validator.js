// validator.js — JSON Schema validation (draft-07 subset, no external deps)

export function validate(data, schema) {
  const errors = [];
  validateNode(data, schema, [], errors, schema);
  return errors.map(e => ({
    path: e.path.join('\x00'),
    pathDisplay: e.path.length ? '$.' + e.path.join('.') : '$',
    message: e.message
  }));
}

function validateNode(data, schema, path, errors, rootSchema) {
  if (!schema || typeof schema !== 'object') return;

  // $ref
  if (schema.$ref) {
    const ref = resolveRef(schema.$ref, rootSchema);
    if (ref) validateNode(data, ref, path, errors, rootSchema);
    return;
  }

  // type
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actualType = getType(data);
    if (!types.includes(actualType)) {
      errors.push({ path, message: `Expected type ${types.join(' or ')}, got ${actualType}` });
      return;
    }
  }

  // enum
  if (schema.enum) {
    const match = schema.enum.some(v => deepEqual(v, data));
    if (!match) errors.push({ path, message: `Value must be one of: ${schema.enum.map(v => JSON.stringify(v)).join(', ')}` });
  }

  // const
  if ('const' in schema && !deepEqual(schema.const, data)) {
    errors.push({ path, message: `Value must be exactly ${JSON.stringify(schema.const)}` });
  }

  const t = getType(data);

  // String validations
  if (t === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength)
      errors.push({ path, message: `String too short (min ${schema.minLength})` });
    if (schema.maxLength !== undefined && data.length > schema.maxLength)
      errors.push({ path, message: `String too long (max ${schema.maxLength})` });
    if (schema.pattern) {
      try {
        if (!new RegExp(schema.pattern).test(data))
          errors.push({ path, message: `String does not match pattern: ${schema.pattern}` });
      } catch {}
    }
    if (schema.format) {
      const fmtErr = checkFormat(data, schema.format);
      if (fmtErr) errors.push({ path, message: fmtErr });
    }
  }

  // Number validations
  if (t === 'number' || t === 'integer') {
    if (schema.minimum !== undefined && data < schema.minimum)
      errors.push({ path, message: `Value ${data} < minimum ${schema.minimum}` });
    if (schema.maximum !== undefined && data > schema.maximum)
      errors.push({ path, message: `Value ${data} > maximum ${schema.maximum}` });
    if (schema.exclusiveMinimum !== undefined && data <= schema.exclusiveMinimum)
      errors.push({ path, message: `Value must be > ${schema.exclusiveMinimum}` });
    if (schema.exclusiveMaximum !== undefined && data >= schema.exclusiveMaximum)
      errors.push({ path, message: `Value must be < ${schema.exclusiveMaximum}` });
    if (schema.multipleOf !== undefined && data % schema.multipleOf !== 0)
      errors.push({ path, message: `Value must be a multiple of ${schema.multipleOf}` });
    if (t === 'integer' && !Number.isInteger(data))
      errors.push({ path, message: `Value must be an integer` });
  }

  // Array validations
  if (t === 'array') {
    if (schema.minItems !== undefined && data.length < schema.minItems)
      errors.push({ path, message: `Array too short (min ${schema.minItems} items)` });
    if (schema.maxItems !== undefined && data.length > schema.maxItems)
      errors.push({ path, message: `Array too long (max ${schema.maxItems} items)` });
    if (schema.uniqueItems) {
      const strs = data.map(v => JSON.stringify(v));
      if (new Set(strs).size !== strs.length)
        errors.push({ path, message: 'Array items must be unique' });
    }
    if (schema.items) {
      if (Array.isArray(schema.items)) {
        schema.items.forEach((s, i) => {
          if (i < data.length) validateNode(data[i], s, [...path, i], errors, rootSchema);
        });
      } else {
        data.forEach((item, i) => validateNode(item, schema.items, [...path, i], errors, rootSchema));
      }
    }
  }

  // Object validations
  if (t === 'object') {
    if (schema.required) {
      for (const req of schema.required) {
        if (!(req in data)) errors.push({ path: [...path, req], message: `Required property "${req}" is missing` });
      }
    }
    if (schema.minProperties !== undefined && Object.keys(data).length < schema.minProperties)
      errors.push({ path, message: `Object needs at least ${schema.minProperties} properties` });
    if (schema.maxProperties !== undefined && Object.keys(data).length > schema.maxProperties)
      errors.push({ path, message: `Object has too many properties (max ${schema.maxProperties})` });

    if (schema.properties) {
      for (const [k, subSchema] of Object.entries(schema.properties)) {
        if (k in data) validateNode(data[k], subSchema, [...path, k], errors, rootSchema);
      }
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties || {}));
      for (const k of Object.keys(data)) {
        if (!allowed.has(k)) errors.push({ path: [...path, k], message: `Additional property "${k}" not allowed` });
      }
    }
    if (schema.patternProperties) {
      for (const [pattern, subSchema] of Object.entries(schema.patternProperties)) {
        const re = new RegExp(pattern);
        for (const k of Object.keys(data)) {
          if (re.test(k)) validateNode(data[k], subSchema, [...path, k], errors, rootSchema);
        }
      }
    }
  }

  // Combinators
  if (schema.allOf) {
    for (const s of schema.allOf) validateNode(data, s, path, errors, rootSchema);
  }
  if (schema.anyOf) {
    const anyPass = schema.anyOf.some(s => {
      const errs = [];
      validateNode(data, s, path, errs, rootSchema);
      return errs.length === 0;
    });
    if (!anyPass) errors.push({ path, message: 'Value must match at least one of the anyOf schemas' });
  }
  if (schema.oneOf) {
    const passing = schema.oneOf.filter(s => {
      const errs = [];
      validateNode(data, s, path, errs, rootSchema);
      return errs.length === 0;
    });
    if (passing.length !== 1) errors.push({ path, message: `Value must match exactly one of the oneOf schemas (matched ${passing.length})` });
  }
  if (schema.not) {
    const errs = [];
    validateNode(data, schema.not, path, errs, rootSchema);
    if (errs.length === 0) errors.push({ path, message: 'Value must NOT match the "not" schema' });
  }

  // if/then/else
  if (schema.if) {
    const condErrs = [];
    validateNode(data, schema.if, path, condErrs, rootSchema);
    if (condErrs.length === 0 && schema.then) validateNode(data, schema.then, path, errors, rootSchema);
    if (condErrs.length > 0 && schema.else) validateNode(data, schema.else, path, errors, rootSchema);
  }
}

function getType(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function resolveRef(ref, schema) {
  if (!ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  let cur = schema;
  for (const p of parts) {
    if (!cur || !(p in cur)) return null;
    cur = cur[p];
  }
  return cur;
}

function checkFormat(val, format) {
  const fmts = {
    'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    'date': /^\d{4}-\d{2}-\d{2}$/,
    'time': /^\d{2}:\d{2}:\d{2}/,
    'email': /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
    'uri': /^[a-zA-Z][a-zA-Z\d+\-.]*:/,
    'ipv4': /^(\d{1,3}\.){3}\d{1,3}$/,
    'uuid': /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  };
  const re = fmts[format];
  if (re && !re.test(val)) return `String does not match format "${format}"`;
  return null;
}
