// tree.js — Virtualised JSON tree renderer

const ITEM_HEIGHT = 24;
const OVERSCAN = 30;

export class TreeView {
  constructor(container, model, opts = {}) {
    this.container = container;
    this.model = model;
    this.opts = opts;
    this._collapsed = new Set();
    this._flatNodes = [];
    this._searchMatches = new Set();
    this._errorPaths = new Map(); // path string -> error message
    this._diffMap = new Map();    // path string -> 'add'|'remove'|'change'
    this._editingPath = null;
    this._scrollTop = 0;

    this._buildFlat();
    this._render();
    this._attachScroll();
  }

  // ── Flatten the JSON tree into a list of node descriptors ──
  _buildFlat() {
    this._flatNodes = [];
    if (!this.model.valid || this.model.data === null) return;
    this._flatten(this.model.data, [], '', 0, true);
  }

  _flatten(value, path, pathStr, depth, isLast) {
    const isCollapsed = this._collapsed.has(pathStr);
    const type = this._typeOf(value);
    const isContainer = type === 'object' || type === 'array';

    let isEmpty = false;
    let keys = null;
    let len = 0;

    if (isContainer) {
      if (type === 'array') {
        len = value.length;
        isEmpty = len === 0;
      } else {
        keys = Object.keys(value);
        len = keys.length;
        isEmpty = len === 0;
      }
    }

    const pathCopy = path.length > 0 ? path.slice() : [];
    const node = { path: pathCopy, depth, type, value, isLast, isContainer, isEmpty, pathStr };
    this._flatNodes.push(node);

    if (isContainer && !isCollapsed && !isEmpty) {
      if (type === 'array') {
        for (let i = 0; i < len; i++) {
          path.push(i);
          const nextStr = pathStr ? pathStr + '\x00' + i : String(i);
          this._flatten(value[i], path, nextStr, depth + 1, i === len - 1);
          path.pop();
        }
      } else {
        for (let i = 0; i < len; i++) {
          const k = keys[i];
          path.push(k);
          const nextStr = pathStr ? pathStr + '\x00' + k : String(k);
          this._flatten(value[k], path, nextStr, depth + 1, i === len - 1);
          path.pop();
        }
      }
      this._flatNodes.push({ path: pathCopy, depth, type, isClosing: true, isLast, pathStr });
    }
  }

  _typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }

  // ── Virtual scroll ──
  _attachScroll() {
    this.container.addEventListener('scroll', () => {
      this._scrollTop = this.container.scrollTop;
      this._renderVisible();
    }, { passive: true });
  }

  _render() {
    this.container.innerHTML = '';
    this._spacer = document.createElement('div');
    this._spacer.className = 'jv-tree-spacer';
    this.container.appendChild(this._spacer);
    this._renderVisible();
  }

  _renderVisible() {
    const viewH = this.container.clientHeight || 1000;
    const start = Math.max(0, Math.floor(this._scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const end = Math.min(this._flatNodes.length, Math.ceil((this._scrollTop + viewH) / ITEM_HEIGHT) + OVERSCAN);

    const topPadding = start * ITEM_HEIGHT;
    const totalHeight = this._flatNodes.length * ITEM_HEIGHT;
    const bottomPadding = Math.max(0, totalHeight - (end * ITEM_HEIGHT));

    // For better performance with variable heights, we clear and re-render if nodes don't match.
    // However, we'll try to reuse existing elements if they are still within the window.
    const existing = Array.from(this._spacer.querySelectorAll('[data-idx]'));
    const existingIdxs = new Set(existing.map(el => +el.dataset.idx));

    // Clear and rebuild is safer for flow-based layout
    this._spacer.innerHTML = '';
    
    const topPadEl = document.createElement('div');
    topPadEl.style.height = `${topPadding}px`;
    this._spacer.appendChild(topPadEl);

    for (let i = start; i < end; i++) {
      const node = this._flatNodes[i];
      if (!node) continue;
      const el = this._buildNodeEl(node, i);
      this._spacer.appendChild(el);
    }

    const bottomPadEl = document.createElement('div');
    bottomPadEl.style.height = `${bottomPadding}px`;
    this._spacer.appendChild(bottomPadEl);
  }

  // ── Build a single node element ──
  _buildNodeEl(node, idx) {
    const el = document.createElement('div');
    el.className = 'jv-node';
    el.dataset.idx = idx;
    el.dataset.path = node.pathStr;

    const diffCls = this._diffMap.get(node.pathStr);
    if (diffCls) el.classList.add('diff-' + diffCls);
    if (this._searchMatches.has(node.pathStr)) el.classList.add('jv-match-highlight');
    if (this._errorPaths.has(node.pathStr)) el.classList.add('jv-error-node');

    // Indent
    const indent = document.createElement('div');
    indent.className = 'jv-indent';
    indent.style.width = `${node.depth * 20}px`;
    for (let i = 0; i < node.depth; i++) {
      const seg = document.createElement('div');
      seg.className = 'jv-indent-seg';
      indent.appendChild(seg);
    }
    el.appendChild(indent);

    if (node.isClosing) {
      const bracket = document.createElement('div');
      bracket.className = 'jv-indent';
      bracket.style.width = '20px';
      el.appendChild(bracket);

      const inner = document.createElement('div');
      inner.className = 'jv-node-inner';
      const br = document.createElement('span');
      br.className = 'jv-bracket';
      br.textContent = node.type === 'array' ? ']' : '}';
      inner.appendChild(br);
      if (!node.isLast) {
        const comma = document.createElement('span');
        comma.className = 'jv-comma';
        comma.textContent = ',';
        inner.appendChild(comma);
      }
      el.appendChild(inner);
      return el;
    }

    // Toggle
    const toggle = document.createElement('div');
    toggle.className = 'jv-toggle';
    if (node.isContainer && !node.isEmpty) {
      toggle.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 4 3-4H2z"/></svg>`;
      if (this._collapsed.has(node.pathStr)) toggle.classList.add('collapsed');
      toggle.addEventListener('click', (e) => { e.stopPropagation(); this._toggleCollapse(node); });
    } else {
      toggle.classList.add('leaf');
      toggle.innerHTML = `<svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" opacity="0.3"><circle cx="3" cy="3" r="1.5"/></svg>`;
    }
    el.appendChild(toggle);

    // Inner content
    const inner = document.createElement('div');
    inner.className = 'jv-node-inner';

    // Key
    if (node.path.length > 0) {
      const keyEl = document.createElement('span');
      keyEl.className = 'jv-key';
      const keyVal = node.path[node.path.length - 1];
      keyEl.textContent = typeof keyVal === 'number' ? `${keyVal}` : `"${keyVal}"`;
      keyEl.title = 'Double-click to rename key';
      keyEl.addEventListener('dblclick', () => this._startKeyEdit(keyEl, node));
      inner.appendChild(keyEl);

      const colon = document.createElement('span');
      colon.className = 'jv-colon';
      colon.textContent = ':';
      inner.appendChild(colon);
    }

    // Value / bracket
    if (node.isContainer) {
      const openBr = document.createElement('span');
      openBr.className = 'jv-bracket';
      const isCollapsed = this._collapsed.has(node.pathStr);
      if (node.isEmpty) {
        openBr.textContent = node.type === 'array' ? '[]' : '{}';
      } else if (isCollapsed) {
        const len = Array.isArray(node.value) ? node.value.length : Object.keys(node.value).length;
        openBr.textContent = node.type === 'array' ? '[' : '{';
        const meta = document.createElement('span');
        meta.className = 'jv-meta';
        meta.textContent = `${len} ${node.type === 'array' ? 'item' : 'key'}${len !== 1 ? 's' : ''}`;
        const closeBr = document.createElement('span');
        closeBr.className = 'jv-bracket';
        closeBr.textContent = node.type === 'array' ? ']' : '}';
        inner.appendChild(openBr);
        inner.appendChild(meta);
        inner.appendChild(closeBr);
      } else {
        openBr.textContent = node.type === 'array' ? '[' : '{';
        inner.appendChild(openBr);
      }
      if (node.isEmpty) inner.appendChild(openBr);
    } else {
      const valEl = document.createElement('span');
      valEl.className = `jv-value t-${node.type}`;
      valEl.textContent = this._displayValue(node.value, node.type);
      valEl.title = 'Click to edit';
      valEl.addEventListener('click', () => this._startValueEdit(valEl, node));
      inner.appendChild(valEl);

      // Error badge
      const errMsg = this._errorPaths.get(node.pathStr);
      if (errMsg) {
        const badge = document.createElement('span');
        badge.className = 'jv-error-badge';
        badge.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 1a4 4 0 100 8A4 4 0 005 1zm0 2.5c.28 0 .5.22.5.5v2a.5.5 0 01-1 0V4c0-.28.22-.5.5-.5zm0 4.5a.5.5 0 110-1 .5.5 0 010 1z"/></svg> invalid`;
        const tip = document.createElement('span');
        tip.className = 'jv-error-tip';
        tip.textContent = errMsg;
        badge.appendChild(tip);
        inner.appendChild(badge);
      }
    }

    // Comma
    if (!node.isContainer || node.isEmpty) {
      if (!node.isLast) {
        const comma = document.createElement('span');
        comma.className = 'jv-comma';
        comma.textContent = ',';
        inner.appendChild(comma);
      }
    }

    el.appendChild(inner);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'jv-node-actions';

    // Copy value
    const copyBtn = document.createElement('button');
    copyBtn.className = 'jv-action-btn';
    copyBtn.title = 'Copy value';
    copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M10 2H4a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2zm0 10H4V4h6v8zm2-10v1h1v8h-1v1h1a2 2 0 002-2V4a2 2 0 00-2-2h-1z"/></svg>`;
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = node.isContainer ? JSON.stringify(node.value, null, 2) : String(node.value);
      navigator.clipboard.writeText(val);
      if (this.opts.onToast) this.opts.onToast('Copied!', 'success');
    });
    actions.appendChild(copyBtn);

    // Add field (objects/arrays)
    if (node.isContainer) {
      const addBtn = document.createElement('button');
      addBtn.className = 'jv-action-btn';
      addBtn.title = 'Add field';
      addBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/></svg>`;
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._addField(node);
      });
      actions.appendChild(addBtn);
    }

    // Delete
    if (node.path.length > 0) {
      const delBtn = document.createElement('button');
      delBtn.className = 'jv-action-btn delete';
      delBtn.title = 'Delete';
      delBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v.5H3a.5.5 0 000 1h.5V12a2 2 0 002 2h5a2 2 0 002-2V4.5H13a.5.5 0 000-1h-2V3a1 1 0 00-1-1H6zm1 1h2v.5H7V3zm-2 2h6V12a1 1 0 01-1 1H6a1 1 0 01-1-1V5zm2 2a.5.5 0 01.5.5v3a.5.5 0 01-1 0v-3A.5.5 0 017 7zm2 0a.5.5 0 01.5.5v3a.5.5 0 01-1 0v-3A.5.5 0 019 7z"/></svg>`;
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.model.delete(node.path);
        this.refresh();
      });
      actions.appendChild(delBtn);
    }

    el.appendChild(actions);
    return el;
  }

  _displayValue(value, type) {
    if (type === 'string') return `"${value}"`;
    if (type === 'null') return 'null';
    return String(value);
  }

  // ── Collapse / expand ──
  _toggleCollapse(node) {
    if (this._collapsed.has(node.pathStr)) {
      this._collapsed.delete(node.pathStr);
    } else {
      this._collapsed.add(node.pathStr);
    }
    this.refresh();
  }

  collapseAll() {
    this._setCollapsedAll(true);
    this.refresh();
  }

  expandAll() {
    this._setCollapsedAll(false);
    this.refresh();
  }

  _setCollapsedAll(state) {
    if (!state) {
      this._collapsed.clear();
      return;
    }
    const visit = (v, path) => {
      const type = this._typeOf(v);
      if (type !== 'object' && type !== 'array') return;
      const pathStr = path.join('\x00');
      this._collapsed.add(pathStr);
      const keys = type === 'array' ? [...v.keys()] : Object.keys(v);
      keys.forEach(k => visit(v[k], [...path, k]));
    };
    if (this.model.data) visit(this.model.data, []);
  }

  expandToDiffs(diffMap) {
    this._setCollapsedAll(true); // Collapse everything first
    this._collapsed.delete('');   // Always keep root expanded for context
    if (!diffMap || diffMap.size === 0) {
      this.refresh();
      return;
    }
    for (const [pathStr, type] of diffMap) {
      if (!pathStr && pathStr !== '') continue; // Safety check
      if (type === 'add' || type === 'remove' || type === 'change') {
        const parts = pathStr.split('\x00');
        let currentPath = '';
        for (let i = 0; i < parts.length; i++) {
          currentPath = currentPath ? currentPath + '\x00' + parts[i] : parts[i];
          this._collapsed.delete(currentPath); // Expand this parent/node
        }
      }
    }
    this.refresh();
  }

  // ── Editing ──
  _startValueEdit(el, node) {
    if (this._editingPath) return;
    this._editingPath = node.pathStr;

    const input = document.createElement('input');
    input.className = 'jv-edit-input';
    input.value = node.type === 'string' ? node.value : String(node.value);
    input.style.width = Math.max(80, el.offsetWidth + 20) + 'px';

    // Type picker
    const picker = document.createElement('div');
    picker.className = 'jv-type-picker';
    ['string', 'number', 'boolean', 'null'].forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'jv-type-opt' + (t === node.type ? ' active' : '');
      btn.textContent = t;
      btn.dataset.type = t;
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        picker.querySelectorAll('.jv-type-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      picker.appendChild(btn);
    });

    el.replaceWith(input);
    inner_append(el.parentElement, picker);
    input.focus();
    input.select();

    const commit = () => {
      const activeType = picker.querySelector('.jv-type-opt.active')?.dataset.type || node.type;
      const raw = input.value;
      let coerced;
      try {
        if (activeType === 'string') coerced = raw;
        else if (activeType === 'number') coerced = Number(raw);
        else if (activeType === 'boolean') coerced = raw === 'true' || raw === '1';
        else if (activeType === 'null') coerced = null;
        else coerced = JSON.parse(raw);
      } catch { coerced = raw; }
      this.model.set(node.path, coerced);
      this._editingPath = null;
      picker.remove();
      this.refresh();
    };

    const cancel = () => {
      this._editingPath = null;
      picker.remove();
      this.refresh();
    };

    input.addEventListener('blur', () => setTimeout(commit, 120));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });

    function inner_append(parent, el) {
      if (parent) parent.appendChild(el);
    }
  }

  _startKeyEdit(el, node) {
    if (this._editingPath) return;
    if (typeof node.path[node.path.length - 1] === 'number') return; // array index
    this._editingPath = node.pathStr;

    const input = document.createElement('input');
    input.className = 'jv-edit-input';
    const currentKey = node.path[node.path.length - 1];
    input.value = String(currentKey);
    input.style.width = Math.max(60, el.offsetWidth + 20) + 'px';
    el.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
      const newKey = input.value.trim();
      if (newKey && newKey !== currentKey) {
        this.model.renameKey(node.path, newKey);
      }
      this._editingPath = null;
      this.refresh();
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); this._editingPath = null; this.refresh(); }
    });
  }

  _addField(node) {
    const isArray = Array.isArray(node.value);
    if (!isArray) {
      const key = prompt('New field name:');
      if (!key) return;
      this.model.addField(node.path, key, '');
    } else {
      this.model.addField(node.path, null, '');
    }
    this._collapsed.delete(node.pathStr);
    this.refresh();
  }

  // ── Search integration ──
  setMatches(pathStrs) {
    this._searchMatches = new Set(pathStrs);
    this._recolorVisible();
  }

  clearMatches() {
    this._searchMatches.clear();
    this._recolorVisible();
  }

  // ── Schema errors ──
  setErrors(errors) {
    this._errorPaths = new Map(errors.map(e => [e.path, e.message]));
    this._spacer.querySelectorAll('[data-idx]').forEach(el => el.remove());
    this._renderVisible();
  }

  clearErrors() {
    this._errorPaths.clear();
    this._spacer.querySelectorAll('[data-idx]').forEach(el => el.remove());
    this._renderVisible();
  }

  // ── Diff ──
  setDiff(diffMap) {
    this._diffMap = diffMap;
    this._spacer.querySelectorAll('[data-path]').forEach(el => {
      el.classList.remove('diff-add', 'diff-remove', 'diff-change');
      const diffCls = this._diffMap.get(el.dataset.path);
      if (diffCls) el.classList.add('diff-' + diffCls);
    });
  }

  clearDiff() {
    this._diffMap.clear();
    this._spacer.querySelectorAll('[data-path]').forEach(el => {
      el.classList.remove('diff-add', 'diff-remove', 'diff-change');
    });
  }

  // ── Scroll to path ──
  scrollToPath(pathStr) {
    const idx = this._flatNodes.findIndex(n => n.pathStr === pathStr && !n.isClosing);
    if (idx < 0) return;
    const top = idx * ITEM_HEIGHT;
    const viewH = this.container.clientHeight;
    if (top < this.container.scrollTop || top > this.container.scrollTop + viewH - ITEM_HEIGHT) {
      this.container.scrollTop = Math.max(0, top - viewH / 2);
    }
  }

  _recolorVisible() {
    this._spacer.querySelectorAll('[data-path]').forEach(el => {
      const pathStr = el.dataset.path;
      el.classList.toggle('jv-match-highlight', this._searchMatches.has(pathStr));
    });
  }

  refresh() {
    this._buildFlat();
    this._spacer.style.height = `${this._flatNodes.length * ITEM_HEIGHT}px`;
    // Remove all rendered nodes and re-render visible
    this._spacer.querySelectorAll('[data-idx]').forEach(el => el.remove());
    this._renderVisible();
    if (this.opts.onRefresh) this.opts.onRefresh(this._flatNodes.length);
  }

  get nodeCount() { return this._flatNodes.length; }
}
