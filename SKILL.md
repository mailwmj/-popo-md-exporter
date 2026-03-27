---
name: popo-doc-to-markdown
description: "已登录 POPO 页面一键复制 Markdown 的 Chrome 插件，图片可导出到本地附件目录。"
metadata:
  version: "3.0.0"
---
# popo-doc-to-markdown

在已登录的 POPO 文档页面中，点击 Chrome 扩展图标，直接将当前文档高保真转换为 Markdown，导出图片到本地附件目录，并复制到剪贴板。页面内会显示明显的成功或失败提示。

## When to use

- 用户已经在 Chrome 中登录了 POPO 文档
- 用户正在浏览 `docs.popo.netease.com` 或相关 POPO 文档页面
- 用户想把当前文档内容复制到 Obsidian 或其他 Markdown 编辑器
- 用户需要保留标题、代码块、表格、图片等常见结构，并希望图片能在 Obsidian 中真实显示

## Instructions

### 安装与构建

```bash
npm install
npm run build
```

构建完成后，加载 `dist/` 目录为 Chrome 已解压扩展。

### 使用方式

1. 打开 Chrome 扩展管理页 `chrome://extensions`
2. 启用“开发者模式”
3. 加载项目生成的 `dist/` 目录
4. 在已登录的 POPO 文档页面点击扩展图标
5. 第一次使用时，先打开扩展设置页，选择图片导出目录
6. 之后插件会：
   - 抓取当前文档正文
   - 转换为 Markdown
   - 下载可访问图片并写入你选定的附件目录
   - 直接复制到剪贴板
   - 在页面右上角显示 `已复制成功`、部分成功提示或明确错误信息

### 输出说明

- **成功时**：Markdown 已写入系统剪贴板
- **图片**：优先写入本地附件目录，并把 Markdown 改写为同目录文件名链接
- **部分成功时**：未能导出的图片会退回远程链接，并明确提示数量
- **失败时**：页面内显示失败 toast，不伪造成功

## Scope

### 当前版本包含

- 已登录 POPO 页面抓取
- 高保真 Markdown 转换
- 本地图片附件导出
- 页面内 toast 提示
- 首次目录设置页

### 当前版本不包含

- 自动登录
- Cookie 持久化
- Obsidian vault 直写
- Markdown 预览弹窗
- 自动替你创建或管理 Obsidian 笔记文件

## Dependencies

- turndown: ^7.2.0
- esbuild: ^0.25.3
- typescript: ^5.6.0

## Tags

- popo
- document
- markdown
- chrome-extension
- obsidian
