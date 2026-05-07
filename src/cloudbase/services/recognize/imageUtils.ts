/**
 * AI 识别服务 - 图片工具函数
 */

/**
 * 压缩图片 Base64，确保不超过指定大小（默认 2MB）
 * 智谱 API 对大图片会返回 500 错误
 */
export async function compressImage(base64: string, maxSizeKB: number = 2048): Promise<string> {
  const sizeKB = base64.length * 3 / 4 / 1024
  if (sizeKB <= maxSizeKB) {
    return base64
  }

  console.log(`[compressImage] 图片 ${Math.round(sizeKB)}KB > ${maxSizeKB}KB，需要压缩...`)

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // 计算压缩后的尺寸（等比缩放）
      const maxDim = 1200  // 最大边 1200px
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round(height * maxDim / width)
          width = maxDim
        } else {
          width = Math.round(width * maxDim / height)
          height = maxDim
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      // 逐步降低质量直到满足大小要求
      let quality = 0.8
      let compressed = canvas.toDataURL('image/jpeg', quality)
      while (compressed.length * 3 / 4 / 1024 > maxSizeKB && quality > 0.3) {
        quality -= 0.1
        compressed = canvas.toDataURL('image/jpeg', quality)
      }

      // 移除 data:image/jpeg;base64, 前缀
      const result = compressed.replace(/^data:image\/\w+;base64,/, '')
      console.log(`[compressImage] 压缩完成: ${Math.round(result.length * 3 / 4 / 1024)}KB`)
      resolve(result)
    }
    img.src = `data:image/jpeg;base64,${base64}`
  })
}
