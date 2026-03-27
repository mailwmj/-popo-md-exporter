import { getAttachmentsDirectoryHandle } from './settings.js'
import type { ImageWriteRequest, ImageWriteResult } from './types.js'

export function base64ToUint8Array(base64Data: string): Uint8Array {
  const binary = atob(base64Data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function writeSingleFile(
  directoryHandle: FileSystemDirectoryHandle,
  request: ImageWriteRequest,
): Promise<ImageWriteResult> {
  try {
    const fileHandle = await directoryHandle.getFileHandle(request.fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(base64ToUint8Array(request.base64Data))
    await writable.close()

    return {
      placeholder: request.placeholder,
      ok: true,
    }
  } catch (error) {
    return {
      placeholder: request.placeholder,
      ok: false,
      error: error instanceof Error ? error.message : '写入图片失败',
    }
  }
}

export async function writeImagesToAttachmentsDirectory(requests: ImageWriteRequest[]): Promise<ImageWriteResult[]> {
  const directoryHandle = await getAttachmentsDirectoryHandle()
  if (!directoryHandle) {
    throw new Error('请先在扩展设置中选择图片导出目录')
  }

  return Promise.all(requests.map((request) => writeSingleFile(directoryHandle, request)))
}
