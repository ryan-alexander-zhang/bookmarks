const urlInput = document.getElementById("url");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const categoryInput = document.getElementById("category");
const tagsInput = document.getElementById("tags");
const categoryList = document.getElementById("category-list");
const tagSuggestions = document.getElementById("tag-suggestions");
const metadataStatus = document.getElementById("metadata-status");
const status = document.getElementById("status");
const submitButton = document.getElementById("submit");
const settingsButton = document.getElementById("open-settings");
const form = document.getElementById("bookmark-form");

let titleEdited = false;
let descriptionEdited = false;
let tagsEdited = false;
let currentBlacklist = [];
let activeTabId = null;
let lastFetchedUrl = null;

const fetchJson = async (path, options) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  if (response.status === 204) {
    return undefined;
  }

  return response.json();
};

const queryTabs = (query) => new Promise((resolve) => chrome.tabs.query(query, resolve));
const getStorage = (keys) => new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
const setStorage = (payload) => new Promise((resolve) => chrome.storage.sync.set(payload, resolve));

const normalizeTags = (value) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const matchesBlacklist = (url, blacklist) => {
  if (!url) {
    return false;
  }
  return blacklist.some((entry) => entry && url.includes(entry));
};

const updateBlockedState = () => {
  const blocked = matchesBlacklist(urlInput.value.trim(), currentBlacklist);
  if (blocked) {
    status.textContent = "This URL is blocked by your blacklist.";
    status.classList.add("error");
  } else {
    status.textContent = "";
    status.classList.remove("error");
  }
  submitButton.disabled = blocked;
};

const loadCategories = async () => {
  try {
    const categories = await fetchJson("/categories");
    categoryList.innerHTML = "";
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.name;
      categoryList.appendChild(option);
    });
  } catch (error) {
    metadataStatus.textContent = "Failed to load categories.";
  }
};

const loadTags = async () => {
  try {
    const tags = await fetchJson("/tags");
    if (tags.length > 0) {
      tagSuggestions.textContent = `Suggestions: ${tags.map((tag) => tag.name).join(" ")}`;
    }
  } catch (error) {
    metadataStatus.textContent = "Failed to load tag suggestions.";
  }
};

const loadMetadata = async (url) => {
  if (!url || url === lastFetchedUrl) {
    return;
  }

  metadataStatus.textContent = "Fetching metadata...";
  try {
    const data = await fetchJson(`/bookmarks/lookup?url=${encodeURIComponent(url)}`);
    lastFetchedUrl = url;

    if (!titleEdited && data.title) {
      titleInput.value = data.title;
    }

    if (!descriptionEdited && data.description) {
      descriptionInput.value = data.description;
    }

    if (data.found) {
      if (!tagsEdited && data.tags) {
        tagsInput.value = data.tags.map((tag) => tag.name).join(", ");
      }
      categoryInput.value = data.category || "";
    }
  } catch (error) {
    metadataStatus.textContent = "Metadata fetch failed.";
    return;
  }

  metadataStatus.textContent = "";
};

const getTabDescription = async (tabId) => {
  if (!tabId) {
    return "";
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.querySelector('meta[name="description"]')?.content || ""
    });

    return results?.[0]?.result || "";
  } catch (error) {
    return "";
  }
};

const init = async () => {
  const { blacklist } = await getStorage({ blacklist: DEFAULT_BLACKLIST });
  currentBlacklist = Array.isArray(blacklist) ? blacklist : DEFAULT_BLACKLIST;
  await setStorage({ blacklist: currentBlacklist });

  settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());

  const [activeTab] = await queryTabs({ active: true, currentWindow: true });
  if (activeTab) {
    activeTabId = activeTab.id;
    urlInput.value = activeTab.url || "";
    titleInput.value = activeTab.title || "";
    const description = await getTabDescription(activeTab.id);
    descriptionInput.value = description;
    await loadMetadata(urlInput.value.trim());
  }

  updateBlockedState();
  await Promise.all([loadCategories(), loadTags()]);
};

urlInput.addEventListener("input", () => {
  updateBlockedState();
});

urlInput.addEventListener("blur", () => {
  loadMetadata(urlInput.value.trim());
});

titleInput.addEventListener("input", () => {
  titleEdited = true;
});

descriptionInput.addEventListener("input", () => {
  descriptionEdited = true;
});

tagsInput.addEventListener("input", () => {
  tagsEdited = true;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const url = urlInput.value.trim();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const category = categoryInput.value.trim();
  const tags = normalizeTags(tagsInput.value);

  updateBlockedState();
  if (submitButton.disabled) {
    return;
  }

  submitButton.disabled = true;
  status.textContent = "Saving bookmark...";
  status.classList.remove("error");

  try {
    await fetchJson("/bookmarks", {
      method: "POST",
      body: JSON.stringify({
        url,
        title,
        description,
        category,
        tags
      })
    });

    status.textContent = "Saved successfully.";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Save failed.";
    status.classList.add("error");
  } finally {
    submitButton.disabled = matchesBlacklist(url, currentBlacklist);
  }
});

init();
