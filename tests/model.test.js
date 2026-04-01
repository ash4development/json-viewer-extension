import { jest, expect } from '@jest/globals';
import { JSONModel } from '../ui/model.js';

describe('JSONModel', () => {
  let model;
  const initialData = { a: 1, b: [2, 3], c: { d: 4 } };

  beforeEach(() => {
    model = new JSONModel(JSON.stringify(initialData));
  });

  test('should parse initial JSON', () => {
    expect(model.data).toEqual(initialData);
    expect(model.valid).toBe(true);
    expect(model.error).toBeNull();
  });

  test('should handle invalid JSON', () => {
    const invalidModel = new JSONModel('{ invalid }');
    expect(invalidModel.valid).toBe(false);
    expect(invalidModel.error).toBeDefined();
    expect(invalidModel.data).toBeNull();
  });

  test('get should return values at various paths', () => {
    expect(model.get(['a'])).toBe(1);
    expect(model.get(['b', 0])).toBe(2);
    expect(model.get(['c', 'd'])).toBe(4);
    expect(model.get(['non', 'existent'])).toBeUndefined();
  });

  test('set should update values and emit change', () => {
    const spy = jest.fn();
    model.on('change', spy);
    model.set(['a'], 10);
    expect(model.data.a).toBe(10);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ path: ['a'], value: 10 }));
  });

  test('delete should remove keys and emit change', () => {
    const spy = jest.fn();
    model.on('change', spy);
    model.delete(['b', 0]);
    expect(model.data.b).toEqual([3]);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ path: ['b', 0], deleted: true }));
  });

  test('renameKey should rename object keys', () => {
    model.renameKey(['c', 'd'], 'e');
    expect(model.data.c.e).toBe(4);
    expect(model.data.c.d).toBeUndefined();
  });

  test('undo and redo should manage state snapshots', () => {
    model.set(['a'], 10);
    expect(model.data.a).toBe(10);
    model.undo();
    expect(model.data.a).toBe(1);
    model.redo();
    expect(model.data.a).toBe(10);
  });

  test('undo stack should respect limit', () => {
    for (let i = 0; i < 60; i++) {
      model.set(['a'], i);
    }
    // Limit is 50, initial state + 50 Changes.
    // Actually the limit is 50 of PREVIOUS states.
    expect(model.canUndo).toBe(true);
    // After 60 changes, the first 10 snapshots should be shifted out.
  });

  test('toJSON should return stringified data', () => {
    expect(model.toJSON()).toBe(JSON.stringify(initialData, null, 2));
  });

  test('updateFromRaw should update data if valid', () => {
    const ok = model.updateFromRaw('{"new": "data"}');
    expect(ok).toBe(true);
    expect(model.data).toEqual({ new: "data" });
  });

  test('updateFromRaw should return false if invalid', () => {
    const ok = model.updateFromRaw('{ bad }');
    expect(ok).toBe(false);
    expect(model.data).toEqual(initialData);
  });
});
