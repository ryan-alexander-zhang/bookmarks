const blacklistInput = document.getElementById("blacklist");
const saveButton = document.getElementById("save");
const resetButton = document.getElementById("reset");
const status = document.getElementById("status");

const getStorage = (keys) => new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
const setStorage = (payload) => new Promise((resolve) => chrome.storage.sync.set(payload, resolve));

const loadBlacklist = async () => {
  const { blacklist } = await getStorage({ blacklist: DEFAULT_BLACKLIST });
  const entries = Array.isArray(blacklist) ? blacklist : DEFAULT_BLACKLIST;
  blacklistInput.value = entries.join("\n");
};

const saveBlacklist = async (entries) => {
  await setStorage({ blacklist: entries });
  status.textContent = "Settings saved.";
};

saveButton.addEventListener("click", async () => {
  const entries = blacklistInput.value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
  await saveBlacklist(entries);
});

resetButton.addEventListener("click", async () => {
  blacklistInput.value = DEFAULT_BLACKLIST.join("\n");
  await saveBlacklist(DEFAULT_BLACKLIST);
});

loadBlacklist();
