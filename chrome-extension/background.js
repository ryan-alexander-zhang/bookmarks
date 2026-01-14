importScripts("defaults.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["blacklist"], (data) => {
    if (!Array.isArray(data.blacklist) || data.blacklist.length === 0) {
      chrome.storage.sync.set({ blacklist: DEFAULT_BLACKLIST });
    }
  });
});
