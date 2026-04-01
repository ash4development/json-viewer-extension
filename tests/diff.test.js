import { expect } from '@jest/globals';
import { diffJSON, diffStats } from '../ui/diff.js';

describe('Structural JSON Diff', () => {
  test('should return empty for identical objects', () => {
    const obj = { a: 1, b: [2] };
    const diffs = diffJSON(obj, obj);
    expect(diffs.length).toBe(0);
  });

  test('should detect additions and removals in objects', () => {
    const a = { x: 1 };
    const b = { x: 1, y: 2 };
    const diffs = diffJSON(a, b);
    expect(diffs).toContainEqual(expect.objectContaining({ type: 'add', newVal: 2 }));

    const diffs2 = diffJSON(b, a);
    expect(diffs2).toContainEqual(expect.objectContaining({ type: 'remove', oldVal: 2 }));
  });

  test('should detect changes in values', () => {
    const a = { x: 1 };
    const b = { x: 2 };
    const diffs = diffJSON(a, b);
    expect(diffs).toContainEqual(expect.objectContaining({ type: 'change', oldVal: 1, newVal: 2 }));
  });

  test('should align arrays with insertions/deletions', () => {
    const a = [1, 2, 3, 4, 5];
    const b = [1, 2, 4, 5]; // deleted '3'
    const diffs = diffJSON(a, b);
    expect(diffs).toContainEqual(expect.objectContaining({ type: 'remove', oldVal: 3 }));

    const c = [1, 2, 2.5, 3, 4, 5]; // added '2.5'
    const diffs2 = diffJSON(a, c);
    expect(diffs2).toContainEqual(expect.objectContaining({ type: 'add', newVal: 2.5 }));
  });

  test('should handle nested structural changes', () => {
    const a = { users: [{ id: 1 }] };
    const b = { users: [{ id: 1, name: "Alice" }] };
    const diffs = diffJSON(a, b);
    expect(diffs.length).toBe(1);
    expect(diffs[0].type).toBe('add');
  });

  test('diffStats should summarize counts accurately', () => {
    const diffs = [
      { type: 'add' }, { type: 'add' },
      { type: 'remove' },
      { type: 'change' }
    ];
    const stats = diffStats(diffs);
    expect(stats).toEqual({ added: 2, removed: 1, changed: 1 });
  });
});
