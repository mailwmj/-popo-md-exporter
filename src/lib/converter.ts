import TurndownService from 'turndown'
import type { ConvertMarkdownResult, MarkdownImageAsset, PopoDocumentHtml } from './types.js'

function normalizeImageUrl(src: string): string {
  const trimmed = src.trim()
  if (!trimmed || trimmed.startsWith('data:image')) {
    return ''
  }

  try {
    return new URL(trimmed, 'https://office.netease.com').toString().replace(/ /g, '%20')
  } catch {
    return trimmed.replace(/ /g, '%20')
  }
}

function createBaseTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
    fence: '```',
    linkStyle: 'inlined',
    preformattedCode: false,
  })

  // @ts-expect-error Turndown internal API used intentionally
  service.escape = (text: string) => text

  return service
}

function collectImageAsset(
  images: MarkdownImageAsset[],
  src: string,
  alt: string,
  title?: string,
): string {
  const placeholder = `__POPO_IMAGE_${images.length}__`
  images.push({
    placeholder,
    src,
    alt,
    title,
  })
  return placeholder
}

function buildImagePlaceholder(
  images: MarkdownImageAsset[],
  src: string,
  alt: string,
  title?: string,
): string {
  if (!src) {
    return ''
  }

  return collectImageAsset(images, src, alt || '图像', title)
}

function createCellConverter(images: MarkdownImageAsset[]): TurndownService {
  const cellConverter = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  })

  cellConverter.addRule('cellImage', {
    filter: 'img',
    replacement: (_content, node) => {
      const img = node as HTMLImageElement
      const src = normalizeImageUrl(img.getAttribute('src') || '')
      const alt = img.getAttribute('alt') || img.getAttribute('title') || '图像'
      const title = img.getAttribute('title') || undefined
      return buildImagePlaceholder(images, src, alt, title)
    },
  })

  cellConverter.addRule('cellTodo', {
    filter: (node) => node.nodeName === 'DIV' && (node as HTMLElement).getAttribute('data-block-type') === 'todo',
    replacement: (_content, node) => {
      const element = node as HTMLElement
      const checked = element.querySelector('[data-todo-label]')?.getAttribute('data-todo-label') === 'true'
      const textContent = Array.from(element.querySelectorAll('span[data-bulb-node-id]'))
        .map((span) => span.textContent?.trim())
        .filter(Boolean)
        .join(' ')
      return `- ${checked ? '[x]' : '[ ]'} ${textContent}\n`
    },
  })

  cellConverter.addRule('cellOrderedList', {
    filter: (node) => node.nodeName === 'OL' && (node as HTMLElement).getAttribute('data-block-type') === 'list-item',
    replacement: (_content, node) => {
      const element = node as HTMLElement
      const placeholder = element.querySelector('.item-list-placeholder') as HTMLElement | null
      const number = (placeholder?.textContent?.trim() || '1.').replace('.', '')
      const textContent = element.querySelector('li')?.textContent?.trim() || ''
      return `${number}.  ${textContent}\n`
    },
  })

  cellConverter.addRule('cellUnorderedList', {
    filter: (node) => node.nodeName === 'UL' && (node as HTMLElement).getAttribute('data-block-type') === 'list-item',
    replacement: (_content, node) => {
      const textContent = (node as HTMLElement).querySelector('li')?.textContent?.trim() || ''
      return `-   ${textContent}\n`
    },
  })

  cellConverter.addRule('cellCodeBlock', {
    filter: (node) => node.nodeName === 'DIV' && (node as HTMLElement).getAttribute('data-block-type') === 'code',
    replacement: (_content, node) => {
      const element = node as HTMLElement
      const language = element.querySelector('.code-language-change-btn > span')?.textContent?.trim() || ''
      const codeText = Array.from(element.querySelectorAll('pre[data-block-type="code-line"]'))
        .map((line) => line.querySelector('code')?.textContent || '')
        .join('\n')
      if (!codeText) {
        return ''
      }
      return language ? `\`\`\`${language}\n${codeText}\n\`\`\`\n` : `\`\`\`\n${codeText}\n\`\`\`\n`
    },
  })

  return cellConverter
}

function registerMarkdownRules(service: TurndownService, images: MarkdownImageAsset[]): void {
  service.addRule('removeStyle', {
    filter: ['style'],
    replacement: () => '',
  })

  service.addRule('removeScript', {
    filter: ['script'],
    replacement: () => '',
  })

  service.addRule('removeSvg', {
    filter: (node) => node.nodeName === 'svg' || node.nodeName === 'SVG',
    replacement: () => '',
  })

  service.addRule('mermaidDiagram', {
    filter: (node) => {
      if (node.nodeName !== 'DIV') return false
      const element = node as HTMLElement
      const className = element.getAttribute('class') || ''
      return (
        (className.includes('mermaid') && className.includes('diagram')) ||
        (element.hasAttribute('data-value') &&
          element.getAttribute('data-type') === 'diagram')
      )
    },
    replacement: (_content, node) => {
      const element = node as HTMLElement
      let dataValue = element.getAttribute('data-value')

      if (!dataValue) {
        const innerNode = element.querySelector('[data-value]')
        dataValue = innerNode?.getAttribute('data-value') || ''
      }

      if (dataValue) {
        const decoded = dataValue
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
        return `\n\`\`\`mermaid\n${decoded}\n\`\`\`\n`
      }

      const proseMirror = element.querySelector('.ProseMirror')
      if (proseMirror?.textContent) {
        return `\n\`\`\`mermaid\n${proseMirror.textContent}\n\`\`\`\n`
      }

      return ''
    },
  })

  service.addRule('codeFence', {
    filter: (node) => {
      if (node.nodeName !== 'DIV') return false
      const element = node as HTMLElement
      const className = element.getAttribute('class') || ''
      return className.includes('code-fence') && !className.includes('code-fence_selector')
    },
    replacement: (_content, node) => {
      const element = node as HTMLElement
      const language = element.getAttribute('data-language') || ''
      const langTag = language === 'null' || !language ? '' : language
      const codeDiv = element.querySelector('pre code div')
      const fallbackCode = element.querySelector('pre code')
      const rawCode = codeDiv?.textContent || fallbackCode?.textContent || ''
      const codeContent = rawCode
        .replace(/\n$/, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim()

      return codeContent ? `\n\`\`\`${langTag}\n${codeContent}\n\`\`\`\n` : ''
    },
  })

  service.addRule('imageContainer', {
    filter: (node) => {
      if (node.nodeName !== 'SPAN') return false
      const element = node as HTMLElement
      return (element.getAttribute('class') || '').includes('image-container')
    },
    replacement: (_content, node) => {
      const img = (node as HTMLElement).querySelector('img') as HTMLImageElement | null
      const src = normalizeImageUrl(img?.getAttribute('src') || '')
      const alt = img?.getAttribute('alt') || img?.getAttribute('title') || '图像'
      const title = img?.getAttribute('title') || undefined
      return buildImagePlaceholder(images, src, alt, title)
    },
  })

  service.addRule('horizontalRule', {
    filter: (node) => node.nodeName === 'HR',
    replacement: () => '\n***\n',
  })

  service.addRule('removeDecorations', {
    filter: (node) => {
      if (!['DIV', 'SPAN', 'IMG', 'BR'].includes(node.nodeName)) return false
      const element = node as HTMLElement
      const className = element.getAttribute('class') || ''
      if (className.includes('image-container')) return false
      if (className.includes('code-fence') && !className.includes('code-fence_selector')) return false
      return (
        className.includes('milkdown-') ||
        className.includes('list-item_label') ||
        className.includes('icon') ||
        className.includes('placeholder') ||
        className.includes('separator') ||
        className.includes('trailingBreak') ||
        className === 'ProseMirror-separator'
      )
    },
    replacement: () => '',
  })
}

function registerRichTextRules(service: TurndownService, images: MarkdownImageAsset[]): void {
  service.addRule('removeStyleScript', {
    filter: ['style', 'script'],
    replacement: () => '',
  })

  service.addRule('filterBase64Images', {
    filter: 'img',
    replacement: (_content, node) => {
      const img = node as HTMLImageElement
      const src = normalizeImageUrl(img.getAttribute('src') || '')
      const alt = img.getAttribute('alt') || img.getAttribute('title') || '图像'
      const title = img.getAttribute('title') || undefined
      return buildImagePlaceholder(images, src, alt, title)
    },
  })

  service.addRule('bulbHeading', {
    filter: (node) => node.nodeName === 'DIV' && ((node as HTMLElement).getAttribute('class') || '').includes('bulb-heading'),
    replacement: (content, node) => {
      const level = (node as HTMLElement).getAttribute('data-heading-level') || 'h1'
      return `\n${'#'.repeat(Number.parseInt(level.replace('h', ''), 10))} ${content}\n`
    },
  })

  service.addRule('bulbTodo', {
    filter: (node) => node.nodeName === 'DIV' && (node as HTMLElement).getAttribute('data-block-type') === 'todo',
    replacement: (_content, node) => {
      const element = node as HTMLElement
      const checked = element.querySelector('[data-todo-label]')?.getAttribute('data-todo-label') === 'true'
      const textContent = Array.from(element.querySelectorAll('span[data-bulb-node-id]'))
        .map((span) => span.textContent?.trim())
        .filter(Boolean)
        .join(' ')
      return `- ${checked ? '[x]' : '[ ]'} ${textContent}\n`
    },
  })

  service.addRule('bulbImage', {
    filter: (node) => {
      if (node.nodeName !== 'DIV') return false
      const element = node as HTMLElement
      if (element.getAttribute('data-block-type') !== 'image') return false
      let parent = element.parentElement
      while (parent) {
        if (parent.classList.contains('diagram-template')) {
          return false
        }
        parent = parent.parentElement
      }
      return true
    },
    replacement: (_content, node) => {
      const img = (node as HTMLElement).querySelector('img') as HTMLImageElement | null
      const src = normalizeImageUrl(img?.getAttribute('src') || '')
      const alt = img?.getAttribute('alt') || img?.getAttribute('title') || '图像'
      const title = img?.getAttribute('title') || undefined
      const placeholder = buildImagePlaceholder(images, src, alt, title)
      return placeholder ? `\n${placeholder}\n` : ''
    },
  })

  service.addRule('bulbTable', {
    filter: (node) => node.nodeName === 'DIV' && (node as HTMLElement).getAttribute('data-block-type') === 'table',
    replacement: (_content, node) => {
      const table = (node as HTMLElement).querySelector('table')
      if (!table) {
        return ''
      }

      const rows = Array.from(table.querySelectorAll('tr[data-block-type="table-row"]'))
      if (rows.length === 0) {
        return ''
      }

      const cellConverter = createCellConverter(images)
      const tableData = rows.map((row) =>
        Array.from(row.querySelectorAll('td[data-block-type="table-cell"]')).map((cell) =>
          cellConverter.turndown(cell.innerHTML).trim().replace(/\|/g, '\\|').replace(/\n/g, '<br>'),
        ),
      )

      const maxCols = Math.max(...tableData.map((row) => row.length))
      let markdown = '\n'
      markdown += `| ${tableData[0].map((cell) => cell || ' ').join(' | ')} |\n`
      markdown += `| ${Array(maxCols).fill('---').join(' | ')} |\n`
      for (let index = 1; index < tableData.length; index += 1) {
        markdown += `| ${tableData[index].map((cell) => cell || ' ').join(' | ')} |\n`
      }
      return `${markdown}\n`
    },
  })

  service.addRule('bulbOrderedList', {
    filter: (node) => node.nodeName === 'OL' && (node as HTMLElement).getAttribute('data-block-type') === 'list-item',
    replacement: (_content, node) => {
      const element = node as HTMLElement
      const placeholder = element.querySelector('.item-list-placeholder') as HTMLElement | null
      const leftValue = Number.parseInt(placeholder?.style.left || '0', 10)
      const indent = leftValue >= 56 ? '        ' : leftValue >= 28 ? '    ' : ''
      const number = (placeholder?.textContent?.trim() || '1.').replace('.', '')
      const textContent = element.querySelector('li')?.textContent?.trim() || ''
      return `${indent}${number}.  ${textContent}\n`
    },
  })

  service.addRule('bulbUnorderedList', {
    filter: (node) => node.nodeName === 'UL' && (node as HTMLElement).getAttribute('data-block-type') === 'list-item',
    replacement: (_content, node) => {
      const element = node as HTMLElement
      const placeholder = element.querySelector('.item-list-placeholder') as HTMLElement | null
      const leftValue = Number.parseInt(placeholder?.style.left || '0', 10)
      const indent = leftValue >= 56 ? '        ' : leftValue >= 28 ? '    ' : ''
      const textContent = element.querySelector('li')?.textContent?.trim() || ''
      return `${indent}-   ${textContent}\n`
    },
  })

  service.addRule('bulbCodeBlock', {
    filter: (node) => node.nodeName === 'DIV' && (node as HTMLElement).getAttribute('data-block-type') === 'code',
    replacement: (_content, node) => {
      const element = node as HTMLElement
      const language = element.querySelector('.code-language-change-btn > span')?.textContent?.trim() || ''
      const codeText = Array.from(element.querySelectorAll('pre[data-block-type="code-line"]'))
        .map((line) => line.querySelector('code')?.textContent || '')
        .join('\n')
      if (!codeText) {
        return ''
      }
      return language ? `\n\`\`\`${language}\n${codeText}\n\`\`\`\n` : `\n\`\`\`\n${codeText}\n\`\`\`\n`
    },
  })

  service.addRule('removePlaceholder', {
    filter: (node) => {
      if (node.nodeName !== 'DIV') return false
      const className = (node as HTMLElement).getAttribute('class') || ''
      return className.includes('item-list-placeholder') || className.includes('heading-fold-button')
    },
    replacement: () => '',
  })

  service.addRule('removeDecorations', {
    filter: (node) => {
      if (!['DIV', 'SPAN'].includes(node.nodeName)) return false
      const className = (node as HTMLElement).getAttribute('class') || ''
      return className.includes('bulb-') && !className.includes('bulb-editor') && !className.includes('bulb-heading')
    },
    replacement: (content) => content,
  })
}

export function convertPopoHtmlToMarkdown(documentHtml: PopoDocumentHtml): ConvertMarkdownResult {
  const images: MarkdownImageAsset[] = []
  const service = createBaseTurndownService()

  if (documentHtml.source === 'markdown') {
    registerMarkdownRules(service, images)
  } else {
    registerRichTextRules(service, images)
  }

  return {
    markdown: normalizeMarkdownOutput(service.turndown(documentHtml.html)),
    images,
  }
}

export function normalizeMarkdownOutput(markdown: string): string {
  return markdown.replace(/\n{3,}/g, '\n\n').trim()
}

export { normalizeImageUrl }
