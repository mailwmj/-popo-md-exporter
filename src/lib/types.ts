export interface PopoEligibilityResult {
  ok: boolean
  reason?: string
}

export type PopoDocumentSource = 'markdown' | 'richtext'

export interface PopoDocumentHtml {
  title: string
  html: string
  source: PopoDocumentSource
}

export interface MarkdownImageAsset {
  placeholder: string
  src: string
  alt: string
  title?: string
}

export interface ConvertMarkdownResult {
  markdown: string
  images: MarkdownImageAsset[]
}

export interface ExportSettings {
  configured: boolean
  folderName?: string
}

export interface PendingImageExport {
  placeholder: string
  src: string
  alt: string
  title?: string
  fileName: string
  markdownLink: string
  fallbackMarkdown: string
}

export interface ImageWriteRequest {
  placeholder: string
  fileName: string
  base64Data: string
}

export interface ImageWriteResult {
  placeholder: string
  ok: boolean
  markdownLink?: string
  error?: string
}

export interface CopyMarkdownResult {
  ok: boolean
  message: string
  markdown?: string
}
