async function copyWithNavigatorClipboard(markdown: string): Promise<void> {
  await navigator.clipboard.writeText(markdown)
}

function copyWithExecCommand(markdown: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = markdown
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)

  const selection = document.getSelection()
  const originalRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null

  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (activeElement) {
    activeElement.focus()
  }

  if (selection) {
    selection.removeAllRanges()
    if (originalRange) {
      selection.addRange(originalRange)
    }
  }

  if (!copied) {
    throw new Error('复制失败，请重新聚焦页面后再试')
  }
}

export async function writeMarkdownToClipboard(markdown: string): Promise<void> {
  try {
    await copyWithNavigatorClipboard(markdown)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Document is not focused')) {
      copyWithExecCommand(markdown)
      return
    }

    throw error
  }
}
