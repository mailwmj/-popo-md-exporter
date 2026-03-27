import { writeImagesToAttachmentsDirectory } from './lib/file-writer.js'
import type { ImageWriteRequest, ImageWriteResult } from './lib/types.js'

const OFFSCREEN_WRITE_IMAGES_MESSAGE_TYPE = 'POPO_OFFSCREEN_WRITE_IMAGES'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== OFFSCREEN_WRITE_IMAGES_MESSAGE_TYPE) {
    return false
  }

  const requests = ((message as { requests?: ImageWriteRequest[] }).requests || []) as ImageWriteRequest[]
  void writeImagesToAttachmentsDirectory(requests)
    .then((results: ImageWriteResult[]) => {
      sendResponse({ ok: true, results })
    })
    .catch((error: unknown) => {
      sendResponse({
        ok: false,
        message: error instanceof Error ? error.message : '图片写入失败',
      })
    })

  return true
})
