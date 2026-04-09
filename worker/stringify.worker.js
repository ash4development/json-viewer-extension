// stringify.worker.js
self.onmessage = function (e) {
  if (e.data.type === 'STRINGIFY') {
    try {
      const result = JSON.stringify(e.data.data, null, e.data.indent || 2);
      const CHUNK_SIZE = 50000;
      let offset = 0;

      while (offset < result.length) {
        const chunk = result.substring(offset, offset + CHUNK_SIZE);
        offset += CHUNK_SIZE;
        self.postMessage({
          type: 'STRINGIFY_CHUNK',
          chunk,
          isLast: offset >= result.length,
          id: e.data.id
        });
      }
    } catch (err) {
      self.postMessage({ type: 'STRINGIFY_ERROR', error: err.message, id: e.data.id });
    }
  } else if (e.data.type === 'PARSE') {
    try {
      const parsed = JSON.parse(e.data.text);
      self.postMessage({ type: 'PARSE_DONE', data: parsed, id: e.data.id });
    } catch (err) {
      self.postMessage({ type: 'PARSE_ERROR', error: err.message, id: e.data.id });
    }
  }
};