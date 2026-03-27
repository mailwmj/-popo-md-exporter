import type { ExportSettings, ImageWriteRequest, ImageWriteResult, MarkdownImageAsset, PendingImageExport, PopoDocumentHtml } from './types.js'

function escapeMarkdownText(value: string): string {
  return value.replace(/[\[\]\\]/g, '\\$&')
}

function sanitizeFileSegment(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256(value: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return toHex(hashBuffer)
}

function inferExtension(asset: MarkdownImageAsset): string {
  const title = asset.title?.trim().toLowerCase() || ''
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(title)) {
    return title.split('.').pop() || 'png'
  }

  try {
    const url = new URL(asset.src)
    const fileName = url.pathname.split('/').pop() || ''
    const extension = fileName.split('.').pop()?.toLowerCase()
    if (extension && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
      return extension
    }
  } catch {
    return 'png'
  }

  return 'png'
}

function joinMarkdownPath(fileName: string): string {
  return fileName
}

function buildMarkdownLink(path: string, alt: string, title?: string): string {
  const safeAlt = escapeMarkdownText(alt || '图像')
  return title ? `![${safeAlt}](${path} "${title.replace(/"/g, '&quot;')}")` : `![${safeAlt}](${path})`
}

async function createFileName(documentHtml: PopoDocumentHtml, asset: MarkdownImageAsset, index: number): Promise<string> {
  const titleBase = sanitizeFileSegment(documentHtml.title) || 'popo-doc'
  const hash = (await sha256(`${documentHtml.title}|${asset.src}|${index}`)).slice(0, 12)
  const extension = inferExtension(asset)
  return `${titleBase}-${hash}.${extension}`
}

export async function buildPendingImageExports(
  documentHtml: PopoDocumentHtml,
  images: MarkdownImageAsset[],
  _settings: ExportSettings,
): Promise<PendingImageExport[]> {
  return Promise.all(
    images.map(async (asset, index) => {
      const fileName = await createFileName(documentHtml, asset, index)
      const markdownPath = joinMarkdownPath(fileName)
      return {
        placeholder: asset.placeholder,
        src: asset.src,
        alt: asset.alt,
        title: asset.title,
        fileName,
        markdownLink: buildMarkdownLink(markdownPath, asset.alt, asset.title),
        fallbackMarkdown: buildMarkdownLink(asset.src, asset.alt, asset.title),
      } satisfies PendingImageExport
    }),
  )
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

export async function fetchImageWriteRequests(pending: PendingImageExport[]): Promise<ImageWriteRequest[]> {
  return Promise.all(
    pending.map(async (item) => {
      const response = await fetch(item.src, { credentials: 'include' })
      if (!response.ok) {
        throw new Error(`图片下载失败: ${response.status}`)
      }

      return {
        placeholder: item.placeholder,
        fileName: item.fileName,
        base64Data: arrayBufferToBase64(await response.arrayBuffer()),
      } satisfies ImageWriteRequest
    }),
  )
}

export function applyImageWriteResults(markdown: string, pending: PendingImageExport[], writeResults: ImageWriteResult[]): {
  markdown: string
  failedCount: number
} {
  const resultByPlaceholder = new Map<string, ImageWriteResult>()
  for (const result of writeResults) {
    resultByPlaceholder.set(result.placeholder, result)
  }

  let nextMarkdown = markdown
  let failedCount = 0

  for (const item of pending) {
    const writeResult = resultByPlaceholder.get(item.placeholder)
    if (writeResult?.ok && writeResult.markdownLink) {
      nextMarkdown = nextMarkdown.replace(item.placeholder, writeResult.markdownLink)
      continue
    }

    failedCount += 1
    nextMarkdown = nextMarkdown.replace(item.placeholder, item.fallbackMarkdown)
  }

  return { markdown: nextMarkdown, failedCount }
}
