// search.js — text search, JSONPath, jq-lite

// ── Text search ──
export function textSearch(data, query, caseSensitive = false) {
  const results = [];
  const q = caseSensitive ? query : query.toLowerCase();

  function visit(value, path) {
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    const pathStr = path.join('\x00');

    if (type !== 'object' && type !== 'array') {
      const str = caseSensitive ? String(value) : String(value).toLowerCase();
      if (str.includes(q)) {
        results.push({ path: [...path], pathStr, value, matchType: 'value' });
      }
    }

    // Check key
    if (path.length > 0) {
      const key = String(path[path.length - 1]);
      const keyStr = caseSensitive ? key : key.toLowerCase();
      if (keyStr.includes(q)) {
        results.push({ path: [...path], pathStr, value, matchType: 'key' });
      }
    }

    if (type === 'object') {
      for (const k of Object.keys(value)) visit(value[k], [...path, k]);
    } else if (type === 'array') {
      for (let i = 0; i < value.length; i++) visit(value[i], [...path, i]);
    }
  }

  visit(data, []);
  return results;
}

// ── JSONPath (simple implementation) ──
export function jsonPath(data, expression) {
  // Supports: $, .key, .*, ['key'], [0], [*], [?(@.x > y)], ..key
  const results = [];

  try {
    const tokens = tokenize(expression);
    evaluate(data, tokens, 0, [], results);
  } catch (e) {
    return { error: e.message, results: [] };
  }

  return { results };
}

function tokenize(expr) {
  expr = expr.trim();
  if (!expr.startsWith('$')) throw new Error('Expression must start with $');
  const tokens = [];
  let i = 1;
  while (i < expr.length) {
    if (expr[i] === '.') {
      i++;
      if (expr[i] === '.') {
        i++;
        // recursive descent
        const start = i;
        while (i < expr.length && expr[i] !== '.' && expr[i] !== '[') i++;
        tokens.push({ type: 'recursive', key: expr.slice(start, i) });
      } else if (expr[i] === '*') {
        tokens.push({ type: 'wildcard' }); i++;
      } else {
        const start = i;
        while (i < expr.length && expr[i] !== '.' && expr[i] !== '[') i++;
        tokens.push({ type: 'key', key: expr.slice(start, i) });
      }
    } else if (expr[i] === '[') {
      i++;
      const start = i;
      let depth = 1;
      while (i < expr.length && depth > 0) {
        if (expr[i] === '[') depth++;
        if (expr[i] === ']') depth--;
        if (depth > 0) i++;
      }
      const inner = expr.slice(start, i).trim();
      i++;

      if (inner === '*') {
        tokens.push({ type: 'wildcard' });
      } else if (inner.startsWith('?')) {
        tokens.push({ type: 'filter', expr: inner.slice(1).trim() });
      } else if (/^\d+$/.test(inner)) {
        tokens.push({ type: 'index', index: parseInt(inner) });
      } else {
        const key = inner.replace(/^['"]|['"]$/g, '');
        tokens.push({ type: 'key', key });
      }
    } else {
      i++;
    }
  }
  return tokens;
}

function evaluate(node, tokens, ti, path, results) {
  if (ti >= tokens.length) {
    results.push({ path: [...path], value: node, pathStr: path.join('\x00') });
    return;
  }

  const tok = tokens[ti];

  if (tok.type === 'key') {
    if (node && typeof node === 'object' && !Array.isArray(node) && tok.key in node) {
      evaluate(node[tok.key], tokens, ti + 1, [...path, tok.key], results);
    }
  } else if (tok.type === 'index') {
    if (Array.isArray(node) && tok.index < node.length) {
      evaluate(node[tok.index], tokens, ti + 1, [...path, tok.index], results);
    }
  } else if (tok.type === 'wildcard') {
    if (Array.isArray(node)) {
      node.forEach((v, i) => evaluate(v, tokens, ti + 1, [...path, i], results));
    } else if (node && typeof node === 'object') {
      Object.keys(node).forEach(k => evaluate(node[k], tokens, ti + 1, [...path, k], results));
    }
  } else if (tok.type === 'filter') {
    if (Array.isArray(node)) {
      node.forEach((v, i) => {
        if (evalFilter(v, tok.expr)) {
          evaluate(v, tokens, ti + 1, [...path, i], results);
        }
      });
    }
  } else if (tok.type === 'recursive') {
    // Current node
    if (tok.key === '*') {
      collectAll(node, path, results, tokens, ti + 1);
    } else {
      if (node && typeof node === 'object' && tok.key in node) {
        evaluate(node[tok.key], tokens, ti + 1, [...path, tok.key], results);
      }
      // Recurse into children
      const children = Array.isArray(node) ? node.entries() : Object.entries(node || {});
      for (const [k, v] of children) {
        evaluate(v, tokens, ti, [...path, k], results);
      }
    }
  }
}

function collectAll(node, path, results, tokens, ti) {
  evaluate(node, tokens, ti, path, results);
  if (Array.isArray(node)) {
    node.forEach((v, i) => collectAll(v, [...path, i], results, tokens, ti));
  } else if (node && typeof node === 'object') {
    Object.keys(node).forEach(k => collectAll(node[k], [...path, k], results, tokens, ti));
  }
}

function evalFilter(item, expr) {
  // Supports (@.field op value) patterns
  try {
    const m = expr.match(/^\(@\.([a-zA-Z_$][\w$]*)\s*(==|!=|>|<|>=|<=)\s*(.+)\)$/);
    if (!m) return false;
    const [, field, op, valStr] = m;
    if (!(field in item)) return false;
    const itemVal = item[field];
    let cmpVal;
    try { cmpVal = JSON.parse(valStr); } catch { cmpVal = valStr.replace(/^['"]|['"]$/g, ''); }
    switch (op) {
      case '==': return itemVal == cmpVal;
      case '!=': return itemVal != cmpVal;
      case '>':  return itemVal > cmpVal;
      case '<':  return itemVal < cmpVal;
      case '>=': return itemVal >= cmpVal;
      case '<=': return itemVal <= cmpVal;
    }
  } catch { return false; }
  return false;
}

// ── jq-lite ──
export function jqLite(data, query) {
  const q = query.trim();
  try {
    const result = applyJq(data, q);
    return { result: result === undefined ? null : result, error: null };
  } catch (e) {
    return { result: null, error: e.message };
  }
}

function applyJq(data, q) {
  // Chain with pipe
  const pipes = splitPipes(q);
  let cur = data;
  for (const pipe of pipes) {
    cur = applyOp(cur, pipe.trim());
  }
  return cur;
}

function splitPipes(q) {
  const parts = [];
  let depth = 0, cur = '';
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === '|' && depth === 0) {
      parts.push(cur); cur = ''; continue;
    }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

function applyOp(data, op) {
  if (op === '.' || op === '') return data;
  if (op === 'keys') return Array.isArray(data) ? [...data.keys()] : Object.keys(data || {});
  if (op === 'values') return Array.isArray(data) ? data : Object.values(data || {});
  if (op === 'length') return Array.isArray(data) ? data.length : typeof data === 'string' ? data.length : Object.keys(data || {}).length;
  if (op === 'type') return data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data;
  if (op === 'reverse') return Array.isArray(data) ? [...data].reverse() : data;
  if (op === 'sort') return Array.isArray(data) ? [...data].sort() : data;
  if (op === 'unique') return Array.isArray(data) ? [...new Set(data.map(v => JSON.stringify(v)))].map(v => JSON.parse(v)) : data;
  if (op === 'flatten') return Array.isArray(data) ? data.flat(Infinity) : data;
  if (op === '.[]') return Array.isArray(data) ? data : Object.values(data || {});

  // .field
  const fieldM = op.match(/^\.([a-zA-Z_$][\w$]*)$/);
  if (fieldM) {
    if (data == null) return null;
    if (Array.isArray(data)) return data.map(item => (item && item[fieldM[1]] !== undefined) ? item[fieldM[1]] : null);
    return data[fieldM[1]] === undefined ? null : data[fieldM[1]];
  }

  // .["field"]
  const bracketM = op.match(/^\.\["?([^"]+)"?\]$/);
  if (bracketM) {
    if (data == null) return null;
    if (Array.isArray(data)) return data.map(item => (item && item[bracketM[1]] !== undefined) ? item[bracketM[1]] : null);
    return data[bracketM[1]] === undefined ? null : data[bracketM[1]];
  }

  // .[n]
  const indexM = op.match(/^\.\[(\d+)\]$/);
  if (indexM) {
    if (data == null) return null;
    const idx = parseInt(indexM[1], 10);
    return data[idx] === undefined ? null : data[idx];
  }

  // select(cond)
  const selectM = op.match(/^select\((.+)\)$/);
  if (selectM) {
    const cond = selectM[1].trim();
    const fn = new Function('_', `try { with(_||{}) { return Boolean(${cond.replace(/@\./g, '_.')}) } } catch(e) { return false }`);
    if (Array.isArray(data)) return data.filter(item => fn(item));
    return fn(data) ? data : null;
  }

  // map(expr)
  const mapM = op.match(/^map\((.+)\)$/);
  if (mapM) {
    if (!Array.isArray(data)) throw new Error('map requires an array');
    const inner = mapM[1].trim();
    return data.map(item => applyJq(item, inner));
  }

  // has("field")
  const hasM = op.match(/^has\("?([^"]+)"?\)$/);
  if (hasM) return data != null && hasM[1] in data;

  // to_entries
  if (op === 'to_entries') return Object.entries(data || {}).map(([k, v]) => ({ key: k, value: v }));
  if (op === 'from_entries') return Object.fromEntries((data || []).map(e => [e.key ?? e.name, e.value]));

  // add
  if (op === 'add') {
    if (Array.isArray(data)) {
      if (data.length === 0) return null;
      if (typeof data[0] === 'number') return data.reduce((a, b) => a + b, 0);
      if (typeof data[0] === 'string') return data.join('');
      if (Array.isArray(data[0])) return data.flat();
    }
    return data;
  }

  throw new Error(`Unknown jq expression: ${op}`);
}
