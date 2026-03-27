import { handleGetPopoDoc } from './handler.js'

async function main() {
  const docUrl = process.argv[2]
  const result = await handleGetPopoDoc({ docUrl })

  if (result.success) {
    console.log(result.content)
    return
  }

  console.error(result.content)
  process.exit(1)
}

main().catch((error) => {
  console.error(`错误：执行失败 - ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
