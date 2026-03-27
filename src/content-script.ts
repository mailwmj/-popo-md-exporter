import { checkPopoPageEligibility, extractPopoDocumentHtml } from './lib/extractor.js'
import { convertPopoHtmlToMarkdown, normalizeMarkdownOutput } from './lib/converter.js'
import { applyImageWriteResults, buildPendingImageExports, fetchImageWriteRequests } from './lib/image-assets.js'
import { getExportSettings } from './lib/settings.js'
import { showToast } from './lib/toast.js'
import { writeMarkdownToClipboard } from './lib/clipboard.js'
import type { CopyMarkdownResult, ImageWriteResult } from './lib/types.js'

const COPY_MESSAGE_TYPE = 'POPO_COPY_MARKDOWN'
const WRITE_IMAGES_MESSAGE_TYPE = 'POPO_WRITE_IMAGES'
const OPEN_OPTIONS_MESSAGE_TYPE = 'POPO_OPEN_OPTIONS'

interface WriteImagesResponse {
  ok: boolean
  message?: string
  results?: ImageWriteResult[]
}

function shouldHandleCopyRequest(): boolean {
  if (!window.location.hostname.includes('office.netease.com')) {
    return false
  }

  if (window.location.pathname.startsWith('/doc-editor')) {
    return false
  }

  return Boolean(document.querySelector('#doc-iframe'))
}

function sendRuntimeMessage<T>(message: Record<string, unknown>): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>
}

async function ensureImageExportReady(): Promise<void> {
  const settings = await getExportSettings()
  if (settings.configured) {
    return
  }

  await sendRuntimeMessage({ type: OPEN_OPTIONS_MESSAGE_TYPE, reason: 'NO_DIRECTORY' })
  throw new Error('请先在扩展设置中选择图片导出目录')
}

async function exportMarkdownImages(markdown: string, documentHtml: ReturnType<typeof extractPopoDocumentHtml>): Promise<{ markdown: string; failedCount: number }> {
  const converted = convertPopoHtmlToMarkdown(documentHtml)
  if (converted.images.length === 0) {
    return { markdown, failedCount: 0 }
  }

  await ensureImageExportReady()
  const settings = await getExportSettings()
  const pending = await buildPendingImageExports(documentHtml, converted.images, settings)
  const requests = await fetchImageWriteRequests(pending)
  const response = await sendRuntimeMessage<WriteImagesResponse>({
    type: WRITE_IMAGES_MESSAGE_TYPE,
    requests,
    pending,
  })

  if (!response.ok || !response.results) {
    if (response.message === 'DIRECTORY_PERMISSION_REQUIRED') {
      await sendRuntimeMessage({ type: OPEN_OPTIONS_MESSAGE_TYPE, reason: 'PERMISSION_DENIED' })
      throw new Error('图片目录权限失效，请重新选择目录')
    }

    throw new Error(response.message || '图片写入失败')
  }

  return applyImageWriteResults(markdown, pending, response.results)
}

async function copyMarkdown(): Promise<CopyMarkdownResult> {
  const eligibility = checkPopoPageEligibility()
  if (!eligibility.ok) {
    return {
      ok: false,
      message: eligibility.reason || '当前页面不支持复制',
    }
  }

  showToast('正在导出图片并复制 Markdown，请稍候…', 'loading')

  const documentHtml = extractPopoDocumentHtml()
  const converted = convertPopoHtmlToMarkdown(documentHtml)

  if (!converted.markdown.trim()) {
    return {
      ok: false,
      message: '正文提取成功，但 Markdown 为空',
    }
  }

  const exported = await exportMarkdownImages(converted.markdown, documentHtml)
  const titlePrefix = documentHtml.title ? `# ${documentHtml.title}\n\n` : ''
  const finalMarkdown = `${titlePrefix}${normalizeMarkdownOutput(exported.markdown)}`.trim()
  await writeMarkdownToClipboard(finalMarkdown)

  return {
    ok: true,
    message: exported.failedCount > 0 ? `已复制成功，但有 ${exported.failedCount} 张图片仍保留远程链接` : '已复制成功',
    markdown: finalMarkdown,
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== COPY_MESSAGE_TYPE) {
    return false
  }

  if (!shouldHandleCopyRequest()) {
    return false
  }

  void copyMarkdown()
    .then((result) => {
      showToast(result.message, result.ok ? 'success' : 'error')
      sendResponse(result)
    })
    .catch(async (error: unknown) => {
      const messageText = error instanceof Error ? error.message : '复制失败'
      if (messageText.includes('图片导出目录') || messageText.includes('权限失效')) {
        await sendRuntimeMessage({ type: OPEN_OPTIONS_MESSAGE_TYPE })
      }
      showToast(messageText, 'error')
      sendResponse({
        ok: false,
        message: messageText,
      } satisfies CopyMarkdownResult)
    })

  return true
})
