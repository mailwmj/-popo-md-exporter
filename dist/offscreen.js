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

// src/lib/settings.ts
var DIRECTORY_HANDLE_KEY = "attachmentsDirectoryHandle";
async function getAttachmentsDirectoryHandle() {
  return getIndexedDbValue(DIRECTORY_HANDLE_KEY);
}

// src/lib/file-writer.ts
function base64ToUint8Array(base64Data) {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
async function writeSingleFile(directoryHandle, request) {
  try {
    const fileHandle = await directoryHandle.getFileHandle(request.fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(base64ToUint8Array(request.base64Data));
    await writable.close();
    return {
      placeholder: request.placeholder,
      ok: true
    };
  } catch (error) {
    return {
      placeholder: request.placeholder,
      ok: false,
      error: error instanceof Error ? error.message : "\u5199\u5165\u56FE\u7247\u5931\u8D25"
    };
  }
}
async function writeImagesToAttachmentsDirectory(requests) {
  const directoryHandle = await getAttachmentsDirectoryHandle();
  if (!directoryHandle) {
    throw new Error("\u8BF7\u5148\u5728\u6269\u5C55\u8BBE\u7F6E\u4E2D\u9009\u62E9\u56FE\u7247\u5BFC\u51FA\u76EE\u5F55");
  }
  return Promise.all(requests.map((request) => writeSingleFile(directoryHandle, request)));
}

// src/offscreen.ts
var OFFSCREEN_WRITE_IMAGES_MESSAGE_TYPE = "POPO_OFFSCREEN_WRITE_IMAGES";
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== OFFSCREEN_WRITE_IMAGES_MESSAGE_TYPE) {
    return false;
  }
  const requests = message.requests || [];
  void writeImagesToAttachmentsDirectory(requests).then((results) => {
    sendResponse({ ok: true, results });
  }).catch((error) => {
    sendResponse({
      ok: false,
      message: error instanceof Error ? error.message : "\u56FE\u7247\u5199\u5165\u5931\u8D25"
    });
  });
  return true;
});
