import { expect } from '@jest/globals';
import { TreeView } from '../ui/tree.js';
import { JSONModel } from '../ui/model.js';

describe('TreeView Component', () => {
  let container;
  let model;
  let view;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.height = '100px';
    container.style.overflow = 'auto';
    document.body.appendChild(container);

    const data = { a: 1, b: [2, 3], c: { d: 4 } };
    model = new JSONModel(JSON.stringify(data));
    view = new TreeView(container, model);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('should initially render visible nodes', () => {
    const nodes = container.querySelectorAll('.jv-node');
    expect(nodes.length).toBeGreaterThan(0);
    expect(container.querySelector('.jv-key').textContent).toBe('"a"');
  });

  test('should toggle collapse on click', () => {
    const toggle = container.querySelector('.jv-toggle');
    // Root is initially expanded. Let's find "b" node directly.
    const bNode = [...container.querySelectorAll('.jv-node')].find(n => n.dataset.path === 'b');
    expect(bNode).toBeDefined();
    const bToggle = bNode.querySelector('.jv-toggle');
    
    bToggle.click(); // Should collapse
    const bToggleAfter = container.querySelector('[data-path="b"] .jv-toggle');
    expect(bToggleAfter.classList.contains('collapsed')).toBe(true);
    
    bToggleAfter.click(); // Should expand
    const bToggleFinal = container.querySelector('[data-path="b"] .jv-toggle');
    expect(bToggleFinal.classList.contains('collapsed')).toBe(false);
  });

  test('collapseAll and expandAll should update all nodes', () => {
    view.collapseAll();
    // Only root level keys should be visible if root expanded, or just root if collapsed.
    // TreeView.js: _setCollapsedAll(true) collapses everything including root.
    expect(view.nodeCount).toBeGreaterThan(0);
    
    view.expandAll();
    expect(view.nodeCount).toBeGreaterThan(5); // Initial data has 7 nodes flat
  });

  test('setMatches should highlight matched nodes', () => {
    view.setMatches(['a']);
    const aNode = container.querySelector('[data-path="a"]');
    expect(aNode.classList.contains('jv-match-highlight')).toBe(true);
  });

  test('setErrors should show error badges', () => {
    view.setErrors([{ path: 'a', message: 'Invalid' }]);
    const aNode = container.querySelector('[data-path="a"]');
    expect(aNode.classList.contains('jv-error-node')).toBe(true);
    expect(aNode.querySelector('.jv-error-badge')).not.toBeNull();
  });

  test('setDiff should apply diff classes', () => {
    const diffMap = new Map([['a', 'change'], ['b', 'add']]);
    view.setDiff(diffMap);
    expect(container.querySelector('[data-path="a"]').classList.contains('diff-change')).toBe(true);
    expect(container.querySelector('[data-path="b"]').classList.contains('diff-add')).toBe(true);
  });

  test('refresh should update the tree on model change', () => {
    model.set(['a'], 100);
    view.refresh();
    const aValue = container.querySelector('[data-path="a"] .jv-value');
    expect(aValue.textContent).toBe('100');
  });
});
