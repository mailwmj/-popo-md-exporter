import { clearExportSettings, getAttachmentsDirectoryHandle, getExportSettings, hasWritableAttachmentsDirectory, setAttachmentsDirectoryHandle, setExportSettings } from './lib/settings.js'

type StatusVariant = 'success' | 'error' | 'info' | 'warning'

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`未找到元素: ${id}`)
  }

  return element as T
}

function setStatus(message: string, variant: StatusVariant = 'info'): void {
  const status = requireElement<HTMLDivElement>('status')
  status.textContent = message
  status.dataset.variant = variant
}

function setBusy(busy: boolean, buttonText?: string): void {
  const chooseButton = requireElement<HTMLButtonElement>('choose-folder-button')
  const resetButton = requireElement<HTMLButtonElement>('reset-button')

  chooseButton.disabled = busy
  resetButton.disabled = busy

  if (buttonText) {
    chooseButton.textContent = buttonText
    return
  }

  chooseButton.textContent = chooseButton.dataset.defaultLabel || '选择附件目录'
}

async function renderCurrentSettings(): Promise<void> {
  const settings = await getExportSettings()
  const directoryHandle = await getAttachmentsDirectoryHandle()
  const writable = await hasWritableAttachmentsDirectory()

  const folderName = requireElement<HTMLSpanElement>('folder-name')
  const hint = requireElement<HTMLParagraphElement>('folder-hint')
  const badge = requireElement<HTMLSpanElement>('setup-badge')
  const chooseButton = requireElement<HTMLButtonElement>('choose-folder-button')
  const resetButton = requireElement<HTMLButtonElement>('reset-button')

  chooseButton.dataset.defaultLabel = directoryHandle ? '重新选择目录' : '选择附件目录'
  chooseButton.textContent = chooseButton.dataset.defaultLabel

  if (!directoryHandle || !settings.configured) {
    folderName.textContent = '未选择文件夹'
    hint.textContent = '先授权一个可写目录。之后在 POPO 页面点扩展图标，图片会自动写进这里。'
    badge.textContent = '未配置'
    badge.dataset.variant = 'info'
    resetButton.disabled = true
    return
  }

  folderName.textContent = settings.folderName || directoryHandle.name
  resetButton.disabled = false

  if (!writable) {
    hint.textContent = '这个目录之前选过，但当前写入权限失效了。请重新选择一次。'
    badge.textContent = '权限失效'
    badge.dataset.variant = 'warning'
    return
  }

  hint.textContent = '目录可用。回到 POPO 文档页点扩展图标，就会导出图片并复制 Markdown。'
  badge.textContent = '已就绪'
  badge.dataset.variant = 'success'
}

async function chooseDirectory(): Promise<void> {
  if (typeof window.showDirectoryPicker !== 'function') {
    throw new Error('当前浏览器不支持目录选择')
  }

  setBusy(true, '选择中…')
  setStatus('请在浏览器弹窗里选择一个可写的附件目录', 'info')

  const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
  const permission = await directoryHandle.requestPermission({ mode: 'readwrite' })
  if (permission !== 'granted') {
    throw new Error('需要文件夹写入权限才能导出图片')
  }

  await setAttachmentsDirectoryHandle(directoryHandle)
  await setExportSettings({
    configured: true,
    folderName: directoryHandle.name,
  })

  await renderCurrentSettings()
  setStatus('已保存附件目录。现在回到 POPO 页面点击扩展图标即可。', 'success')
}

async function resetSettings(): Promise<void> {
  setBusy(true, '处理中…')
  await clearExportSettings()
  await renderCurrentSettings()
  setStatus('已清除附件目录设置。下次复制前需要重新选择目录。', 'info')
}

function wireEvents(): void {
  const chooseButton = requireElement<HTMLButtonElement>('choose-folder-button')
  const resetButton = requireElement<HTMLButtonElement>('reset-button')

  chooseButton.addEventListener('click', () => {
    void chooseDirectory()
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : '选择目录失败', 'error')
      })
      .finally(() => {
        setBusy(false)
      })
  })

  resetButton.addEventListener('click', () => {
    void resetSettings()
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : '清除设置失败', 'error')
      })
      .finally(() => {
        setBusy(false)
      })
  })
}

void renderCurrentSettings()
  .then(() => {
    wireEvents()
    const badge = requireElement<HTMLSpanElement>('setup-badge')
    if (badge.textContent === '已就绪') {
      setStatus('设置已完成，可以直接回到 POPO 页面使用。', 'success')
      return
    }

    if (badge.textContent === '权限失效') {
      setStatus('目录权限失效了，重新选择一次就能恢复。', 'warning')
      return
    }

    setStatus('先选择一个 Obsidian 附件目录，再回到 POPO 页面点击扩展图标。', 'info')
  })
  .catch((error: unknown) => {
    setStatus(error instanceof Error ? error.message : '初始化设置页失败', 'error')
  })
