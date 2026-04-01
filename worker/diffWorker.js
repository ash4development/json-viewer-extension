import { diffJSON, buildDiffMap, diffStats } from '../ui/diff.js';

self.onmessage = (e) => {
  if (e.data.type === 'COMPARE') {
    try {
      const rightData = JSON.parse(e.data.rightText);
      const diffs = diffJSON(e.data.leftData, rightData);
      const stats = diffStats(diffs);
      const diffMap = buildDiffMap(diffs);

      self.postMessage({
        success: true,
        rightData,
        stats,
        diffMapEntries: Array.from(diffMap.entries())
      });
    } catch (err) {
      self.postMessage({ success: false, error: err.message });
    }
  }
};
