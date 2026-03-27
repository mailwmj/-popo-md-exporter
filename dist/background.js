// src/lib/settings.ts
var STORAGE_KEY = "exportSettings";
var DEFAULT_SETTINGS = {
  configured: false
};
async function getExportSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const settings = stored[STORAGE_KEY];
  return settings ? { ...DEFAULT_SETTINGS, ...settings } : { ...DEFAULT_SETTINGS };
}

// src/background.ts
var COPY_MESSAGE_TYPE = "POPO_COPY_MARKDOWN";
var WRITE_IMAGES_MESSAGE_TYPE = "POPO_WRITE_IMAGES";
var OPEN_OPTIONS_MESSAGE_TYPE = "POPO_OPEN_OPTIONS";
var OFFSCREEN_WRITE_IMAGES_MESSAGE_TYPE = "POPO_OFFSCREEN_WRITE_IMAGES";
var OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
var creatingOffscreenDocument = null;
function isDirectoryPermissionError(error) {
  return error instanceof Error && (error.message.includes("\u5BFC\u51FA\u76EE\u5F55") || error.message.includes("\u6743\u9650"));
}
function buildMarkdownMap(requests, pending) {
  const pendingByPlaceholder = new Map(pending.map((item) => [item.placeholder, item]));
  return new Map(
    requests.map((request) => [request.placeholder, pendingByPlaceholder.get(request.placeholder)?.markdownLink || request.fileName])
  );
}
async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: COPY_MESSAGE_TYPE });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["content-script.js"]
    });
  }
}
async function openOptionsPage() {
  await chrome.runtime.openOptionsPage();
}
async function requestCopy(tabId) {
  await chrome.tabs.sendMessage(tabId, { type: COPY_MESSAGE_TYPE });
}
async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });
  if (existingContexts.length > 0) {
    return;
  }
  if (creatingOffscreenDocument) {
    await creatingOffscreenDocument;
    return;
  }
  creatingOffscreenDocument = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ["BLOBS"],
    justification: "Write authenticated POPO images into the configured local attachments directory."
  });
  try {
    await creatingOffscreenDocument;
  } finally {
    creatingOffscreenDocument = null;
  }
}
async function writeImagesInOffscreenDocument(requests) {
  await ensureOffscreenDocument();
  return chrome.runtime.sendMessage({
    type: OFFSCREEN_WRITE_IMAGES_MESSAGE_TYPE,
    requests
  });
}
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }
  const settings = await getExportSettings();
  if (!settings.configured) {
    await openOptionsPage();
    return;
  }
  await ensureContentScript(tab.id);
  await requestCopy(tab.id);
});
async function handleWriteImages(requests, pending) {
  try {
    const offscreenResponse = await writeImagesInOffscreenDocument(requests);
    if (!offscreenResponse.ok || !offscreenResponse.results) {
      return {
        ok: false,
        message: offscreenResponse.message || "\u56FE\u7247\u5199\u5165\u5931\u8D25"
      };
    }
    const markdownLinks = buildMarkdownMap(requests, pending);
    return {
      ok: true,
      results: offscreenResponse.results.map((result) => ({
        ...result,
        markdownLink: result.ok ? markdownLinks.get(result.placeholder) : void 0
      }))
    };
  } catch (error) {
    return {
      ok: false,
      message: isDirectoryPermissionError(error) ? "DIRECTORY_PERMISSION_REQUIRED" : error instanceof Error ? error.message : "\u56FE\u7247\u5199\u5165\u5931\u8D25"
    };
  }
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === OPEN_OPTIONS_MESSAGE_TYPE) {
    void openOptionsPage().then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }
  if (message?.type !== WRITE_IMAGES_MESSAGE_TYPE) {
    return false;
  }
  const requests = message.requests || [];
  const pending = message.pending || [];
  void handleWriteImages(requests, pending).then((result) => {
    sendResponse(result);
  });
  return true;
});
