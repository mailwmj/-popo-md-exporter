import type { PopoDocumentHtml, PopoEligibilityResult } from './types.js'

const TITLE_FALLBACK = '未命名文档'

function getAccessibleDocument(frameWindow: Window | null): Document | null {
  if (!frameWindow) {
    return null
  }

  try {
    return frameWindow.document
  } catch {
    return null
  }
}

function getFrameDocuments(): Document[] {
  const documents: Document[] = [document]
  const frames = Array.from(document.querySelectorAll('iframe'))

  for (const frame of frames) {
    const frameDocument = getAccessibleDocument(frame.contentWindow)
    if (frameDocument) {
      documents.push(frameDocument)
    }
  }

  return documents
}

function isEditorHostDocument(doc: Document): boolean {
  const url = doc.defaultView?.location.href ?? ''
  return url.includes('office.netease.com') || url.includes('lingxi') || doc === document
}

function getEligibleDocuments(): Document[] {
  return getFrameDocuments().filter(isEditorHostDocument)
}

function getTitle(): string {
  const titleElement = document.querySelector('#BULB_DOC_TITLE .editableDiv_olWBIm')
  const titleText = titleElement?.textContent?.trim()
  if (titleText) {
    return titleText
  }

  const pageTitle = document.title.replace(/\s*[-–—]\s*POPO.*$/i, '').trim()
  return pageTitle || TITLE_FALLBACK
}

function findMarkdownHtml(doc: Document): string | null {
  const editor = doc.querySelector('.ProseMirror.editor, .ProseMirror[class*="editor"]') as HTMLElement | null
  const html = editor?.innerHTML?.trim()
  return html && html.length > 50 ? html : null
}

function findRichTextHtml(doc: Document): string | null {
  const editor = doc.querySelector('.bulb-editor.bulb-editor-inner') as HTMLElement | null
  const html = editor?.innerHTML?.trim()
  return html && html.length > 50 ? html : null
}

export function checkPopoPageEligibility(): PopoEligibilityResult {
  const hostname = window.location.hostname
  if (!hostname.includes('popo.netease.com') && !hostname.includes('office.netease.com')) {
    return { ok: false, reason: '当前页面不是 POPO 文档页面' }
  }

  if (window.location.href.includes('/login') || window.location.href.includes('/signin')) {
    return { ok: false, reason: '请先登录 POPO 文档后再试' }
  }

  return { ok: true }
}

export function extractPopoDocumentHtml(): PopoDocumentHtml {
  const docs = getEligibleDocuments()

  for (const doc of docs) {
    const markdownHtml = findMarkdownHtml(doc)
    if (markdownHtml) {
      return {
        title: getTitle(),
        html: markdownHtml,
        source: 'markdown',
      }
    }
  }

  for (const doc of docs) {
    const richTextHtml = findRichTextHtml(doc)
    if (richTextHtml) {
      return {
        title: getTitle(),
        html: richTextHtml,
        source: 'richtext',
      }
    }
  }

  throw new Error('未找到可访问的正文区域')
}
