export interface DocResult {
  success: boolean
  content: string
  title?: string
}

function extractDocId(url: string): string | null {
  try {
    const parsedUrl = new URL(url)
    const paths = parsedUrl.pathname.split('/').filter(Boolean)
    return paths.length > 0 ? paths[paths.length - 1] : null
  } catch {
    return url.match(/\/([^/]+?)\/?$/)?.[1] ?? null
  }
}

export class PopoDocHandler {
  static async handleGetPopoDoc(_args: { docUrl: string }): Promise<DocResult> {
    return {
      success: false,
      content: '错误：该项目已重构为 Chrome 插件，请在已登录的 POPO 页面中点击扩展图标使用。',
    }
  }

  static isSupportedDocUrl(url: string): boolean {
    return extractDocId(url) !== null
  }
}

export async function handleGetPopoDoc(args: { docUrl: string }): Promise<DocResult> {
  return PopoDocHandler.handleGetPopoDoc(args)
}
