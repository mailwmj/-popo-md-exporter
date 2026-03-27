const TOAST_ID = '__popo_doc_to_markdown_toast__'
const TOAST_TEXT_ID = '__popo_doc_to_markdown_toast_text__'
const TOAST_SPINNER_ID = '__popo_doc_to_markdown_toast_spinner__'
const TOAST_STYLE_ID = '__popo_doc_to_markdown_toast_style__'

let hideTimer: number | undefined

function ensureToastStyles(): void {
  if (document.getElementById(TOAST_STYLE_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = TOAST_STYLE_ID
  style.textContent = `
    @keyframes popo-doc-to-markdown-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
  document.documentElement.appendChild(style)
}

function ensureToastContainer(): HTMLDivElement {
  const existing = document.getElementById(TOAST_ID)
  if (existing instanceof HTMLDivElement) {
    return existing
  }

  ensureToastStyles()

  const toast = document.createElement('div')
  toast.id = TOAST_ID
  toast.style.position = 'fixed'
  toast.style.top = '24px'
  toast.style.right = '24px'
  toast.style.zIndex = '2147483647'
  toast.style.maxWidth = '360px'
  toast.style.padding = '12px 16px'
  toast.style.borderRadius = '10px'
  toast.style.fontSize = '14px'
  toast.style.lineHeight = '1.5'
  toast.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  toast.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.18)'
  toast.style.color = '#ffffff'
  toast.style.opacity = '0'
  toast.style.transform = 'translateY(-6px)'
  toast.style.transition = 'opacity 120ms ease, transform 120ms ease'
  toast.style.display = 'flex'
  toast.style.alignItems = 'center'
  toast.style.gap = '10px'

  const spinner = document.createElement('div')
  spinner.id = TOAST_SPINNER_ID
  spinner.style.display = 'none'
  spinner.style.width = '14px'
  spinner.style.height = '14px'
  spinner.style.borderRadius = '999px'
  spinner.style.border = '2px solid rgba(255, 255, 255, 0.35)'
  spinner.style.borderTopColor = '#ffffff'
  spinner.style.animation = 'popo-doc-to-markdown-spin 0.8s linear infinite'
  spinner.style.flex = '0 0 auto'

  const text = document.createElement('div')
  text.id = TOAST_TEXT_ID
  text.style.minWidth = '0'

  toast.appendChild(spinner)
  toast.appendChild(text)
  document.documentElement.appendChild(toast)
  return toast
}

export function showToast(message: string, variant: 'success' | 'error' | 'loading'): void {
  const toast = ensureToastContainer()
  const text = document.getElementById(TOAST_TEXT_ID)
  const spinner = document.getElementById(TOAST_SPINNER_ID)

  if (text instanceof HTMLDivElement) {
    text.textContent = message
  }

  if (spinner instanceof HTMLDivElement) {
    spinner.style.display = variant === 'loading' ? 'block' : 'none'
  }

  toast.style.background =
    variant === 'success'
      ? 'rgba(22, 163, 74, 0.96)'
      : variant === 'error'
        ? 'rgba(220, 38, 38, 0.96)'
        : 'rgba(37, 99, 235, 0.96)'
  toast.style.opacity = '1'
  toast.style.transform = 'translateY(0)'

  if (hideTimer) {
    window.clearTimeout(hideTimer)
    hideTimer = undefined
  }

  if (variant === 'loading') {
    return
  }

  hideTimer = window.setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(-6px)'
    hideTimer = undefined
  }, 2200)
}
