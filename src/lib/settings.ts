import { deleteIndexedDbValue, getIndexedDbValue, setIndexedDbValue } from './indexed-db.js'
import type { ExportSettings } from './types.js'

const STORAGE_KEY = 'exportSettings'
const DIRECTORY_HANDLE_KEY = 'attachmentsDirectoryHandle'

const DEFAULT_SETTINGS: ExportSettings = {
  configured: false,
}

export async function getExportSettings(): Promise<ExportSettings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  const settings = stored[STORAGE_KEY] as ExportSettings | undefined
  return settings ? { ...DEFAULT_SETTINGS, ...settings } : { ...DEFAULT_SETTINGS }
}

export async function setExportSettings(settings: ExportSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings })
}

export async function getAttachmentsDirectoryHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  return getIndexedDbValue<FileSystemDirectoryHandle>(DIRECTORY_HANDLE_KEY)
}

export async function setAttachmentsDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await setIndexedDbValue(DIRECTORY_HANDLE_KEY, handle)
}

export async function clearExportSettings(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
  await deleteIndexedDbValue(DIRECTORY_HANDLE_KEY)
}

export async function hasWritableAttachmentsDirectory(): Promise<boolean> {
  const handle = await getAttachmentsDirectoryHandle()
  if (!handle) {
    return false
  }

  const permission = await handle.queryPermission({ mode: 'readwrite' })
  return permission === 'granted'
}
