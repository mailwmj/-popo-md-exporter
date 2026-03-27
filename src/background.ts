import { getExportSettings } from './lib/settings.js'
import type { ImageWriteRequest, ImageWriteResult, PendingImageExport } from './lib/types.js'

const COPY_MESSAGE_TYPE = 'POPO_COPY_MARKDOWN'
const WRITE_IMAGES_MESSAGE_TYPE = 'POPO_WRITE_IMAGES'
const OPEN_OPTIONS_MESSAGE_TYPE = 'POPO_OPEN_OPTIONS'
const OFFSCREEN_WRITE_IMAGES_MESSAGE_TYPE = 'POPO_OFFSCREEN_WRITE_IMAGES'
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html'

interface WriteImagesResponse {
  ok: boolean
  message?: string
  results?: ImageWriteResult[]
}

let creatingOffscreenDocument: Promise<void> | null = null

function isDirectoryPermissionError(error: unknown): boolean {
  return error instanceof Error && (error.message.includes('导出目录') || error.message.includes('权限'))
}

function buildMarkdownMap(requests: ImageWriteRequest[], pending: PendingImageExport[]): Map<string, string> {
  const pendingByPlaceholder = new Map(pending.map((item) => [item.placeholder, item]))
  return new Map(
    requests.map((request) => [request.placeholder, pendingByPlaceholder.get(request.placeholder)?.markdownLink || request.fileName]),
  )
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: COPY_MESSAGE_TYPE })
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['content-script.js'],
    })
  }
}

async function openOptionsPage(): Promise<void> {
  await chrome.runtime.openOptionsPage()
}

async function requestCopy(tabId: number): Promise<void> {
  await chrome.tabs.sendMessage(tabId, { type: COPY_MESSAGE_TYPE })
}

async function ensureOffscreenDocument(): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl],
  })

  if (existingContexts.length > 0) {
    return
  }

  if (creatingOffscreenDocument) {
    await creatingOffscreenDocument
    return
  }

  creatingOffscreenDocument = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['BLOBS'],
    justification: 'Write authenticated POPO images into the configured local attachments directory.',
  })

  try {
    await creatingOffscreenDocument
  } finally {
    creatingOffscreenDocument = null
  }
}

async function writeImagesInOffscreenDocument(requests: ImageWriteRequest[]): Promise<WriteImagesResponse> {
  await ensureOffscreenDocument()
  return chrome.runtime.sendMessage({
    type: OFFSCREEN_WRITE_IMAGES_MESSAGE_TYPE,
    requests,
  }) as Promise<WriteImagesResponse>
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return
  }

  const settings = await getExportSettings()
  if (!settings.configured) {
    await openOptionsPage()
    return
  }

  await ensureContentScript(tab.id)
  await requestCopy(tab.id)
})

async function handleWriteImages(requests: ImageWriteRequest[], pending: PendingImageExport[]): Promise<WriteImagesResponse> {
  try {
    const offscreenResponse = await writeImagesInOffscreenDocument(requests)
    if (!offscreenResponse.ok || !offscreenResponse.results) {
      return {
        ok: false,
        message: offscreenResponse.message || '图片写入失败',
      }
    }

    const markdownLinks = buildMarkdownMap(requests, pending)
    return {
      ok: true,
      results: offscreenResponse.results.map((result) => ({
        ...result,
        markdownLink: result.ok ? markdownLinks.get(result.placeholder) : undefined,
      })),
    }
  } catch (error) {
    return {
      ok: false,
      message: isDirectoryPermissionError(error)
        ? 'DIRECTORY_PERMISSION_REQUIRED'
        : error instanceof Error
          ? error.message
          : '图片写入失败',
    }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === OPEN_OPTIONS_MESSAGE_TYPE) {
    void openOptionsPage().then(() => {
      sendResponse({ ok: true })
    })
    return true
  }

  if (message?.type !== WRITE_IMAGES_MESSAGE_TYPE) {
    return false
  }

  const requests = ((message as { requests?: ImageWriteRequest[] }).requests || []) as ImageWriteRequest[]
  const pending = ((message as { pending?: PendingImageExport[] }).pending || []) as PendingImageExport[]
  void handleWriteImages(requests, pending).then((result) => {
    sendResponse(result)
  })
  return true
})
