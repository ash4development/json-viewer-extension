// diff.js — structural JSON diff

export function diffJSON(a, b) {
  const results = [];
  const pathA = [];
  const pathB = [];

  const typeOf = v => {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  };

  const fingerprint = (v) => {
    const t = typeOf(v);
    if (t === 'null') return 'null';
    if (t !== 'object' && t !== 'array') return t + ':' + v;
    // High-entropy fingerprint: keys + first 5 values
    const keys = Object.keys(v).sort();
    let str = t + ':' + keys.join(',');
    if (t === 'object') {
      for (let i = 0; i < Math.min(keys.length, 5); i++) {
        const k = keys[i];
        const val = v[k];
        str += '|' + k + ':' + (val && typeof val === 'object' ? (Array.isArray(val) ? 'arr' : 'obj') : val);
      }
    } else {
      str += '@' + v.length;
    }
    return str;
  };

  const traverse = (aV, bV) => {
    const tA = typeOf(aV);
    const tB = typeOf(bV);
    const pA = pathA.join('\x00');
    const pB = pathB.join('\x00');

    if (tA !== tB) {
      results.push({ pathA: pathA.slice(), pathB: pathB.slice(), pathStrA: pA, pathStrB: pB, type: 'change', oldVal: aV, newVal: bV });
      return;
    }

    if (tA === 'object') {
      const keysA = Object.keys(aV);
      const keysB = Object.keys(bV);
      const setA = new Set(keysA);
      const setB = new Set(keysB);

      for (let i = 0; i < keysA.length; i++) {
        const k = keysA[i];
        if (!setB.has(k)) {
          const cPA = [...pathA, k];
          results.push({ pathA: cPA, pathStrA: cPA.join('\x00'), type: 'remove', oldVal: aV[k] });
        } else {
          pathA.push(k);
          pathB.push(k);
          traverse(aV[k], bV[k]);
          pathA.pop();
          pathB.pop();
        }
      }
      for (let i = 0; i < keysB.length; i++) {
        const k = keysB[i];
        if (!setA.has(k)) {
          const cPB = [...pathB, k];
          results.push({ pathB: cPB, pathStrB: cPB.join('\x00'), type: 'add', newVal: bV[k] });
        }
      }
      return;
    }

    if (tA === 'array') {
      let i = 0, j = 0;
      const LOOKAHEAD = 100;
      while (i < aV.length || j < bV.length) {
        if (i < aV.length && j < bV.length) {
          const fA = fingerprint(aV[i]);
          const fB = fingerprint(bV[j]);

          if (fA === fB) {
            pathA.push(i);
            pathB.push(j);
            traverse(aV[i], bV[j]);
            pathA.pop();
            pathB.pop();
            i++; j++;
            continue;
          }

          let foundInB = -1;
          for (let k = j + 1; k < Math.min(j + LOOKAHEAD, bV.length); k++) {
            if (fingerprint(bV[k]) === fA) { foundInB = k; break; }
          }
          if (foundInB !== -1) {
            for (let k = j; k < foundInB; k++) {
              const cPB = [...pathB, k];
              results.push({ pathB: cPB, pathStrB: cPB.join('\x00'), type: 'add', newVal: bV[k] });
            }
            j = foundInB;
            continue;
          }

          let foundInA = -1;
          for (let k = i + 1; k < Math.min(i + LOOKAHEAD, aV.length); k++) {
            if (fingerprint(aV[k]) === fB) { foundInA = k; break; }
          }
          if (foundInA !== -1) {
            for (let k = i; k < foundInA; k++) {
              const cPA = [...pathA, k];
              results.push({ pathA: cPA, pathStrA: cPA.join('\x00'), type: 'remove', oldVal: aV[k] });
            }
            i = foundInA;
            continue;
          }

          pathA.push(i);
          pathB.push(j);
          traverse(aV[i], bV[j]);
          pathA.pop();
          pathB.pop();
          i++; j++;
        } else if (i < aV.length) {
          const cPA = [...pathA, i];
          results.push({ pathA: cPA, pathStrA: cPA.join('\x00'), type: 'remove', oldVal: aV[i] });
          i++;
        } else {
          const cPB = [...pathB, j];
          results.push({ pathB: cPB, pathStrB: cPB.join('\x00'), type: 'add', newVal: bV[j] });
          j++;
        }
      }
      return;
    }

    if (aV !== bV) {
      results.push({ pathA: pathA.slice(), pathB: pathB.slice(), pathStrA: pA, pathStrB: pB, type: 'change', oldVal: aV, newVal: bV });
    }
  };

  traverse(a, b);
  return results;
}

export function buildDiffMap(diffs) {
  // This is now legacy as App uses the direct properties, but kept for compatibility
  const map = new Map();
  for (let i = 0; i < diffs.length; i++) {
    const d = diffs[i];
    const pathStr = d.pathStrA || d.pathStrB;
    map.set(pathStr, d.type);
  }
  return map;
}

export function diffStats(diffs) {
  let added = 0, removed = 0, changed = 0;
  for (let i = 0; i < diffs.length; i++) {
    const d = diffs[i];
    if (d.type === 'add') added++;
    else if (d.type === 'remove') removed++;
    else changed++;
  }
  return { added, removed, changed };
}
