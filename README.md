<<<<<<< HEAD
# popo-doc-to-markdown

只针对已登录 POPO 文档页面的 Chrome 插件。点击扩展图标后，插件会抓取当前文档正文，高保真转换为 Markdown，导出图片到你配置的附件目录，并直接复制到剪贴板。

## 当前版本能力

- ✅ 只针对已登录的 POPO 文档页面工作
- ✅ 点击扩展图标直接复制 Markdown
- ✅ 页面内显示明显的成功 / 失败 toast
- ✅ 保留标题、列表、代码块、表格、图片链接等常见结构
- ✅ 图片写入本地附件目录，并把 Markdown 图片链接改写为本地相对路径
- ✅ 首次使用自动跳到设置页，选择 Obsidian 附件目录

## 不包含的内容

- 不处理登录
- 不直接写入 Obsidian vault 中的笔记文件
- 不提供预览界面
- 不保证首次未授权目录时仍能一键完成，首次需要先选目录

## 安装

```bash
npm install
npm run build
```

构建完成后，会生成 `dist/` 目录和 `dist/manifest.json`。

## 加载到 Chrome

1. 打开 `chrome://extensions`
2. 打开“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择项目里的 `dist/` 目录

## 使用方式

1. 先在 Chrome 里登录 POPO 文档
2. 打开目标文档页面
3. 点击扩展图标
4. 第一次使用时，如果还没设置图片目录，会自动打开扩展设置页
5. 在设置页里选择你的 Obsidian 附件目录
6. 回到文档页面再次点击扩展图标
7. 页面右上角会提示：
   - `已复制成功`
   - 或 `已复制成功，但有 N 张图片仍保留远程链接`
   - 或明确的失败原因
8. 回到 Obsidian 直接粘贴

## 开发说明

### 目录结构

```bash
popo-doc-to-markdown/
├── manifest.json
├── package.json
├── scripts/
│   └── build.mjs
├── tsconfig.json
└── src/
    ├── background.ts
    ├── content-script.ts
    ├── browser.ts
    ├── handler.ts
    ├── index.ts
    └── lib/
        ├── converter.ts
        ├── extractor.ts
        ├── toast.ts
        └── types.ts
```

### 核心模块

- `src/background.ts`：监听扩展图标点击，检查目录配置，并负责图片写入
- `src/content-script.ts`：抓取正文、转换 Markdown、下载图片、写入剪贴板、显示 toast
- `src/options.ts`：选择图片附件目录并保存设置
- `src/lib/extractor.ts`：查找可访问的正文区域和编辑器 DOM
- `src/lib/converter.ts`：HTML 到 Markdown 的转换规则，并收集图片占位符
- `src/lib/image-assets.ts`：生成图片文件名、下载图片、回填本地 Markdown 链接
- `src/lib/settings.ts`：管理目录句柄和扩展设置
- `src/lib/toast.ts`：页面内提示 UI

## 已知风险

POPO 页面正文可能位于 iframe 或跨域 editor 中。当前版本优先尝试访问可达的文档区域；如果无法访问，会明确提示失败，而不是伪造成功。

## License

MIT
=======
# -popo-md-exporter
 popo-md-exporter
>>>>>>> origin/main
