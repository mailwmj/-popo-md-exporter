// src/lib/indexed-db.ts
var DB_NAME = "popo-doc-to-markdown";
var DB_VERSION = 1;
var STORE_NAME = "keyval";
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("\u65E0\u6CD5\u6253\u5F00 IndexedDB"));
  });
}
async function withStore(mode, run) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = run(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB \u8BF7\u6C42\u5931\u8D25"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB \u4E8B\u52A1\u5931\u8D25"));
    transaction.oncomplete = () => database.close();
  });
}
async function getIndexedDbValue(key) {
  const result = await withStore("readonly", (store) => store.get(key));
  return result;
}
async function setIndexedDbValue(key, value) {
  await withStore("readwrite", (store) => store.put(value, key));
}
async function deleteIndexedDbValue(key) {
  await withStore("readwrite", (store) => store.delete(key));
}

// src/lib/settings.ts
var STORAGE_KEY = "exportSettings";
var DIRECTORY_HANDLE_KEY = "attachmentsDirectoryHandle";
var DEFAULT_SETTINGS = {
  configured: false
};
async function getExportSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const settings = stored[STORAGE_KEY];
  return settings ? { ...DEFAULT_SETTINGS, ...settings } : { ...DEFAULT_SETTINGS };
}
async function setExportSettings(settings) {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}
async function getAttachmentsDirectoryHandle() {
  return getIndexedDbValue(DIRECTORY_HANDLE_KEY);
}
async function setAttachmentsDirectoryHandle(handle) {
  await setIndexedDbValue(DIRECTORY_HANDLE_KEY, handle);
}
async function clearExportSettings() {
  await chrome.storage.local.remove(STORAGE_KEY);
  await deleteIndexedDbValue(DIRECTORY_HANDLE_KEY);
}
async function hasWritableAttachmentsDirectory() {
  const handle = await getAttachmentsDirectoryHandle();
  if (!handle) {
    return false;
  }
  const permission = await handle.queryPermission({ mode: "readwrite" });
  return permission === "granted";
}

// src/options.ts
function requireElement(id) {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`\u672A\u627E\u5230\u5143\u7D20: ${id}`);
  }
  return element;
}
function setStatus(message, variant = "info") {
  const status = requireElement("status");
  status.textContent = message;
  status.dataset.variant = variant;
}
function setBusy(busy, buttonText) {
  const chooseButton = requireElement("choose-folder-button");
  const resetButton = requireElement("reset-button");
  chooseButton.disabled = busy;
  resetButton.disabled = busy;
  if (buttonText) {
    chooseButton.textContent = buttonText;
    return;
  }
  chooseButton.textContent = chooseButton.dataset.defaultLabel || "\u9009\u62E9\u9644\u4EF6\u76EE\u5F55";
}
async function renderCurrentSettings() {
  const settings = await getExportSettings();
  const directoryHandle = await getAttachmentsDirectoryHandle();
  const writable = await hasWritableAttachmentsDirectory();
  const folderName = requireElement("folder-name");
  const hint = requireElement("folder-hint");
  const badge = requireElement("setup-badge");
  const chooseButton = requireElement("choose-folder-button");
  const resetButton = requireElement("reset-button");
  chooseButton.dataset.defaultLabel = directoryHandle ? "\u91CD\u65B0\u9009\u62E9\u76EE\u5F55" : "\u9009\u62E9\u9644\u4EF6\u76EE\u5F55";
  chooseButton.textContent = chooseButton.dataset.defaultLabel;
  if (!directoryHandle || !settings.configured) {
    folderName.textContent = "\u672A\u9009\u62E9\u6587\u4EF6\u5939";
    hint.textContent = "\u5148\u6388\u6743\u4E00\u4E2A\u53EF\u5199\u76EE\u5F55\u3002\u4E4B\u540E\u5728 POPO \u9875\u9762\u70B9\u6269\u5C55\u56FE\u6807\uFF0C\u56FE\u7247\u4F1A\u81EA\u52A8\u5199\u8FDB\u8FD9\u91CC\u3002";
    badge.textContent = "\u672A\u914D\u7F6E";
    badge.dataset.variant = "info";
    resetButton.disabled = true;
    return;
  }
  folderName.textContent = settings.folderName || directoryHandle.name;
  resetButton.disabled = false;
  if (!writable) {
    hint.textContent = "\u8FD9\u4E2A\u76EE\u5F55\u4E4B\u524D\u9009\u8FC7\uFF0C\u4F46\u5F53\u524D\u5199\u5165\u6743\u9650\u5931\u6548\u4E86\u3002\u8BF7\u91CD\u65B0\u9009\u62E9\u4E00\u6B21\u3002";
    badge.textContent = "\u6743\u9650\u5931\u6548";
    badge.dataset.variant = "warning";
    return;
  }
  hint.textContent = "\u76EE\u5F55\u53EF\u7528\u3002\u56DE\u5230 POPO \u6587\u6863\u9875\u70B9\u6269\u5C55\u56FE\u6807\uFF0C\u5C31\u4F1A\u5BFC\u51FA\u56FE\u7247\u5E76\u590D\u5236 Markdown\u3002";
  badge.textContent = "\u5DF2\u5C31\u7EEA";
  badge.dataset.variant = "success";
}
async function chooseDirectory() {
  if (typeof window.showDirectoryPicker !== "function") {
    throw new Error("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u76EE\u5F55\u9009\u62E9");
  }
  setBusy(true, "\u9009\u62E9\u4E2D\u2026");
  setStatus("\u8BF7\u5728\u6D4F\u89C8\u5668\u5F39\u7A97\u91CC\u9009\u62E9\u4E00\u4E2A\u53EF\u5199\u7684\u9644\u4EF6\u76EE\u5F55", "info");
  const directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
  const permission = await directoryHandle.requestPermission({ mode: "readwrite" });
  if (permission !== "granted") {
    throw new Error("\u9700\u8981\u6587\u4EF6\u5939\u5199\u5165\u6743\u9650\u624D\u80FD\u5BFC\u51FA\u56FE\u7247");
  }
  await setAttachmentsDirectoryHandle(directoryHandle);
  await setExportSettings({
    configured: true,
    folderName: directoryHandle.name
  });
  await renderCurrentSettings();
  setStatus("\u5DF2\u4FDD\u5B58\u9644\u4EF6\u76EE\u5F55\u3002\u73B0\u5728\u56DE\u5230 POPO \u9875\u9762\u70B9\u51FB\u6269\u5C55\u56FE\u6807\u5373\u53EF\u3002", "success");
}
async function resetSettings() {
  setBusy(true, "\u5904\u7406\u4E2D\u2026");
  await clearExportSettings();
  await renderCurrentSettings();
  setStatus("\u5DF2\u6E05\u9664\u9644\u4EF6\u76EE\u5F55\u8BBE\u7F6E\u3002\u4E0B\u6B21\u590D\u5236\u524D\u9700\u8981\u91CD\u65B0\u9009\u62E9\u76EE\u5F55\u3002", "info");
}
function wireEvents() {
  const chooseButton = requireElement("choose-folder-button");
  const resetButton = requireElement("reset-button");
  chooseButton.addEventListener("click", () => {
    void chooseDirectory().catch((error) => {
      setStatus(error instanceof Error ? error.message : "\u9009\u62E9\u76EE\u5F55\u5931\u8D25", "error");
    }).finally(() => {
      setBusy(false);
    });
  });
  resetButton.addEventListener("click", () => {
    void resetSettings().catch((error) => {
      setStatus(error instanceof Error ? error.message : "\u6E05\u9664\u8BBE\u7F6E\u5931\u8D25", "error");
    }).finally(() => {
      setBusy(false);
    });
  });
}
void renderCurrentSettings().then(() => {
  wireEvents();
  const badge = requireElement("setup-badge");
  if (badge.textContent === "\u5DF2\u5C31\u7EEA") {
    setStatus("\u8BBE\u7F6E\u5DF2\u5B8C\u6210\uFF0C\u53EF\u4EE5\u76F4\u63A5\u56DE\u5230 POPO \u9875\u9762\u4F7F\u7528\u3002", "success");
    return;
  }
  if (badge.textContent === "\u6743\u9650\u5931\u6548") {
    setStatus("\u76EE\u5F55\u6743\u9650\u5931\u6548\u4E86\uFF0C\u91CD\u65B0\u9009\u62E9\u4E00\u6B21\u5C31\u80FD\u6062\u590D\u3002", "warning");
    return;
  }
  setStatus("\u5148\u9009\u62E9\u4E00\u4E2A Obsidian \u9644\u4EF6\u76EE\u5F55\uFF0C\u518D\u56DE\u5230 POPO \u9875\u9762\u70B9\u51FB\u6269\u5C55\u56FE\u6807\u3002", "info");
}).catch((error) => {
  setStatus(error instanceof Error ? error.message : "\u521D\u59CB\u5316\u8BBE\u7F6E\u9875\u5931\u8D25", "error");
});
