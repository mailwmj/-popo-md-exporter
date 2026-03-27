import type { PopoDocumentHtml } from './lib/types.js'

export class PopoBrowserClient {
  static async getDocContent(_docUrl: string): Promise<string> {
    throw new Error('PopoBrowserClient 已废弃，请使用 Chrome 插件入口。')
  }

  static async getDocContentWithTitle(_docUrl: string): Promise<{ title: string; content: string; contentType: 'markdown' | 'html' | 'text' }> {
    throw new Error('PopoBrowserClient 已废弃，请使用 Chrome 插件入口。')
  }
}

export type { PopoDocumentHtml }
