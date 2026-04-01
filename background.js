chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ theme: 'system', proEnabled: false });
});
