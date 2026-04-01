import { expect } from '@jest/globals';
import { validate } from '../ui/validator.js';

describe('JSON Schema Validator', () => {
  test('should validate simple types', () => {
    expect(validate(1, { type: 'integer' })).toEqual([]);
    expect(validate("str", { type: 'string' })).toEqual([]);
    expect(validate(1.1, { type: 'number' })).toEqual([]);
    expect(validate(true, { type: 'boolean' })).toEqual([]);
    expect(validate(null, { type: 'null' })).toEqual([]);
    expect(validate([], { type: 'array' })).toEqual([]);
    expect(validate({}, { type: 'object' })).toEqual([]);

    // Negative types
    expect(validate(1, { type: 'string' }).length).toBe(1);
    expect(validate("1", { type: 'integer' }).length).toBe(1);
  });

  test('should validate enum and const', () => {
    const schema = { enum: [1, "two", { a: 3 }] };
    expect(validate(1, schema)).toEqual([]);
    expect(validate("two", schema)).toEqual([]);
    expect(validate({ a: 3 }, schema)).toEqual([]);
    expect(validate(4, schema).length).toBe(1);

    expect(validate(10, { const: 10 })).toEqual([]);
    expect(validate(11, { const: 10 }).length).toBe(1);
  });

  test('should validate strings with constraints', () => {
    const schema = { minLength: 2, maxLength: 5, pattern: '^[a-z]+$' };
    expect(validate("abc", schema)).toEqual([]);
    expect(validate("a", schema).length).toBe(1);
    expect(validate("abcdef", schema).length).toBe(1);
    expect(validate("123", schema).length).toBe(1);

    expect(validate("2021-01-01T00:00:00Z", { format: 'date-time' })).toEqual([]);
    expect(validate("not-a-date", { format: 'date-time' }).length).toBe(1);
  });

  test('should validate numbers with constraints', () => {
    const schema = { minimum: 10, maximum: 20, multipleOf: 2 };
    expect(validate(12, schema)).toEqual([]);
    expect(validate(8, schema).length).toBe(1);
    expect(validate(22, schema).length).toBe(1);
    expect(validate(13, schema).length).toBe(1);

    expect(validate(10, { exclusiveMinimum: 10 }).length).toBe(1);
    expect(validate(11, { exclusiveMinimum: 10 })).toEqual([]);
  });

  test('should validate arrays with items', () => {
    const schema = { items: { type: 'integer' }, minItems: 1, uniqueItems: true };
    expect(validate([1, 2, 3], schema)).toEqual([]);
    expect(validate([], schema).length).toBe(1);
    expect(validate([1, 1], schema).length).toBe(1);
    expect(validate(["1"], schema).length).toBe(1);

    const tupleSchema = { items: [{ type: 'integer' }, { type: 'string' }] };
    expect(validate([1, "a"], tupleSchema)).toEqual([]);
    expect(validate([1, 1], tupleSchema).length).toBe(1);
  });

  test('should validate objects with properties', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' }
      },
      required: ['id'],
      additionalProperties: false
    };
    expect(validate({ id: 1, name: "foo" }, schema)).toEqual([]);
    expect(validate({ name: "foo" }, schema).length).toBe(1);
    expect(validate({ id: 1, extra: true }, schema).length).toBe(1);
  });

  test('should handle combinations and references', () => {
    const schema = {
      definitions: {
        posInt: { type: 'integer', minimum: 0 }
      },
      anyOf: [
        { $ref: '#/definitions/posInt' },
        { type: 'string' }
      ]
    };
    expect(validate(10, schema)).toEqual([]);
    expect(validate("str", schema)).toEqual([]);
    expect(validate(-1, schema).length).toBe(1);
  });

  test('should handle nested logic (oneOf, not, if/then/else)', () => {
    const schema = {
      if: { properties: { type: { const: 'a' } } },
      then: { properties: { val: { type: 'integer' } } },
      else: { properties: { val: { type: 'string' } } }
    };
    expect(validate({ type: 'a', val: 1 }, schema)).toEqual([]);
    expect(validate({ type: 'b', val: "str" }, schema)).toEqual([]);
    expect(validate({ type: 'a', val: "str" }, schema).length).toBe(1);
  });
});
