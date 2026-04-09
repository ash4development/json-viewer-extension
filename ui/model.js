// model.js — Single source of truth

const UNDO_LIMIT = 50;

class JSONModel {
  constructor(raw) {
    this._raw = raw;
    this._data = null;
    this._valid = false;
    this._error = null;
    this._undoStack = [];
    this._redoStack = [];
    this._listeners = new Set();
    this._parse(raw);
  }

  _parse(text) {
    if (typeof text !== 'string') {
      this._data = text;
      this._valid = true;
      this._error = null;
      return;
    }
    try {
      this._data = JSON.parse(text);
      this._valid = true;
      this._error = null;
    } catch (e) {
      this._valid = false;
      this._error = e.message;
      this._data = null;
    }
  }

  get data() { return this._data; }
  get valid() { return this._valid; }
  get error() { return this._error; }

  // Deep clone for undo snapshots
  _clone(v) {
    if (v === null || typeof v !== 'object') return v;
    return JSON.parse(JSON.stringify(v));
  }

  _snapshot() {
    this._undoStack.push(this._clone(this._data));
    if (this._undoStack.length > UNDO_LIMIT) this._undoStack.shift();
    this._redoStack = [];
  }

  // path: array of keys/indices e.g. ['users', 0, 'name']
  get(path) {
    let cur = this._data;
    for (const seg of path) {
      if (cur == null) return undefined;
      cur = cur[seg];
    }
    return cur;
  }

  set(path, value) {
    if (!this._valid) return;
    this._snapshot();
    if (path.length === 0) {
      this._data = value;
    } else {
      let cur = this._data;
      for (let i = 0; i < path.length - 1; i++) {
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
    }
    this._emit('change', { path, value });
  }

  delete(path) {
    if (!this._valid || path.length === 0) return;
    this._snapshot();
    let cur = this._data;
    for (let i = 0; i < path.length - 1; i++) {
      cur = cur[path[i]];
    }
    const key = path[path.length - 1];
    if (Array.isArray(cur)) {
      cur.splice(key, 1);
    } else {
      delete cur[key];
    }
    this._emit('change', { path, deleted: true });
  }

  renameKey(path, newKey) {
    if (!this._valid || path.length === 0) return;
    this._snapshot();
    let cur = this._data;
    for (let i = 0; i < path.length - 1; i++) {
      cur = cur[path[i]];
    }
    const oldKey = path[path.length - 1];
    if (Array.isArray(cur)) return;
    const entries = Object.entries(cur);
    const newEntries = entries.map(([k, v]) => [k === oldKey ? newKey : k, v]);
    const newObj = Object.fromEntries(newEntries);
    let parent = this._data;
    if (path.length > 1) {
      for (let i = 0; i < path.length - 2; i++) parent = parent[path[i]];
      parent[path[path.length - 2]] = newObj;
    } else {
      this._data = newObj;
    }
    this._emit('change', { path, renamed: newKey });
  }

  addField(path, key, value) {
    if (!this._valid) return;
    this._snapshot();
    const target = path.length === 0 ? this._data : this.get(path);
    if (Array.isArray(target)) {
      target.push(value);
    } else if (target && typeof target === 'object') {
      target[key] = value;
    }
    this._emit('change', { path, added: true });
  }

  undo() {
    if (this._undoStack.length === 0) return false;
    this._redoStack.push(this._clone(this._data));
    this._data = this._undoStack.pop();
    this._emit('change', { undo: true });
    return true;
  }

  redo() {
    if (this._redoStack.length === 0) return false;
    this._undoStack.push(this._clone(this._data));
    this._data = this._redoStack.pop();
    this._emit('change', { redo: true });
    return true;
  }

  reset(raw) {
    this._snapshot();
    this._parse(raw);
    this._emit('change', { reset: true });
  }

  toJSON(indent = 2) {
    return JSON.stringify(this._data, null, indent);
  }

  updateFromRaw(text) {
    try {
      const parsed = JSON.parse(text);
      return this.updateFromData(parsed);
    } catch (e) {
      return false;
    }
  }

  updateFromData(data) {
    try {
      this._snapshot();
      this._data = data;
      this._valid = true;
      this._error = null;
      this._emit('raw-change', {});
      return true;
    } catch (e) {
      return false;
    }
  }

  on(event, fn) {
    this._listeners.add({ event, fn });
    return () => this._listeners.delete({ event, fn });
  }

  _emit(event, detail) {
    for (const { event: e, fn } of this._listeners) {
      if (e === event || e === '*') fn(detail);
    }
  }

  get canUndo() { return this._undoStack.length > 0; }
  get canRedo() { return this._redoStack.length > 0; }
}

export { JSONModel };
