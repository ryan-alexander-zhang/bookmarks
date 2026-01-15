const urlInput = document.getElementById("url");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const categoryInput = document.getElementById("category");
const tagsInput = document.getElementById("tags");
const categorySuggestions = document.getElementById("category-suggestions");
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
let cachedCategories = [];
let cachedTags = [];
let categoryHighlight = -1;
let tagHighlight = -1;

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

const showSuggestions = (container, items, highlightIndex, onSelect) => {
  container.innerHTML = "";
  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `suggestion-item${index === highlightIndex ? " active" : ""}`;
    button.textContent = item;
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => onSelect(item));
    container.appendChild(button);
  });
  container.classList.toggle("visible", items.length > 0);
};

const hideSuggestions = (container) => {
  container.classList.remove("visible");
  container.innerHTML = "";
};

const getCurrentTagToken = (value) => {
  const parts = value.split(",");
  return parts[parts.length - 1].trim().toLowerCase();
};

const replaceCurrentTag = (value, replacement) => {
  const parts = value.split(",");
  const prefix = parts.slice(0, -1).map((part) => part.trim()).filter(Boolean);
  const next = [...prefix, replacement].join(", ");
  return `${next}, `;
};

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
    cachedCategories = categories.map((category) => category.name);
  } catch (error) {
    metadataStatus.textContent = "Failed to load categories.";
  }
};

const loadTags = async () => {
  try {
    const tags = await fetchJson("/tags");
    cachedTags = tags.map((tag) => tag.name);
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

const renderCategorySuggestions = () => {
  const term = categoryInput.value.trim().toLowerCase();
  categoryHighlight = 0;
  const matches = cachedCategories
    .filter((item) => item.toLowerCase().includes(term))
    .slice(0, 6);

  showSuggestions(categorySuggestions, matches, categoryHighlight, (selection) => {
    categoryInput.value = selection;
    hideSuggestions(categorySuggestions);
  });
};

categoryInput.addEventListener("input", () => {
  renderCategorySuggestions();
});

categoryInput.addEventListener("focus", () => {
  renderCategorySuggestions();
});

categoryInput.addEventListener("keydown", (event) => {
  const items = Array.from(categorySuggestions.querySelectorAll(".suggestion-item"));
  if (items.length === 0) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    categoryHighlight = Math.min(items.length - 1, categoryHighlight + 1);
    items.forEach((item, index) => item.classList.toggle("active", index === categoryHighlight));
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    categoryHighlight = Math.max(0, categoryHighlight - 1);
    items.forEach((item, index) => item.classList.toggle("active", index === categoryHighlight));
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const selection = items[categoryHighlight];
    if (selection) {
      categoryInput.value = selection.textContent;
      hideSuggestions(categorySuggestions);
    }
  }
});

categoryInput.addEventListener("blur", () => {
  window.setTimeout(() => hideSuggestions(categorySuggestions), 100);
});

tagsInput.addEventListener("input", () => {
  tagsEdited = true;
  const token = getCurrentTagToken(tagsInput.value);
  tagHighlight = 0;
  if (!token) {
    hideSuggestions(tagSuggestions);
    return;
  }

  const existing = normalizeTags(tagsInput.value).map((tag) => tag.toLowerCase());
  const matches = cachedTags
    .filter((item) => item.toLowerCase().includes(token))
    .filter((item) => !existing.includes(item.toLowerCase()))
    .slice(0, 6);

  showSuggestions(tagSuggestions, matches, tagHighlight, (selection) => {
    tagsInput.value = replaceCurrentTag(tagsInput.value, selection);
    tagsEdited = true;
    hideSuggestions(tagSuggestions);
  });
});

tagsInput.addEventListener("keydown", (event) => {
  const items = Array.from(tagSuggestions.querySelectorAll(".suggestion-item"));
  if (items.length === 0) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    tagHighlight = Math.min(items.length - 1, tagHighlight + 1);
    items.forEach((item, index) => item.classList.toggle("active", index === tagHighlight));
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    tagHighlight = Math.max(0, tagHighlight - 1);
    items.forEach((item, index) => item.classList.toggle("active", index === tagHighlight));
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const selection = items[tagHighlight];
    if (selection) {
      tagsInput.value = replaceCurrentTag(tagsInput.value, selection.textContent);
      tagsEdited = true;
      hideSuggestions(tagSuggestions);
    }
  }
});

tagsInput.addEventListener("blur", () => {
  window.setTimeout(() => hideSuggestions(tagSuggestions), 100);
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
