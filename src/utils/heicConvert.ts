/**
 * HEIC/HEIF 图片格式转换工具（重型依赖，适合懒加载）
 *
 * 将 HEIC/HEIF 格式转换为 JPEG base64，供 RecognizePage 按需加载。
 */

// 使用动态 import 引入重型库
export async function convertHeicToJpeg(file: File): Promise<string> {
  console.log('[heicConvert] 检测到 HEIC/HEIF 格式，开始转换...')

  // 方案1：使用 libheif-js（WASM 版本，支持更多格式）
  try {
    console.log('[heicConvert] 尝试方案1: libheif-js')
    const Libheif = await import('libheif-js')
    const arrayBuffer = await file.arrayBuffer()

    const decoder = new Libheif.HeifDecoder()
    const images = decoder.decode(arrayBuffer)

    if (!images.length) {
      throw new Error('HEIC 文件中没有图片')
    }

    const image = images[0]
    const width = image.get_width()
    const height = image.get_height()
    console.log('[heicConvert] HEIC 尺寸:', width, 'x', height)

    // 解码图片数据
    const imageData = await new Promise<ImageData>((resolve, reject) => {
      image.display(
        { data: new Uint8ClampedArray(width * height * 4), width, height },
        (result: { data: Uint8ClampedArray } | null) => {
          if (!result) {
            reject(new Error('HEIF 处理错误'))
            return
          }
          try {
            resolve(new ImageData(result.data, width, height))
          } catch (e) {
            reject(e)
          }
        }
      )
    })

    // 绘制到 Canvas 并导出为 JPEG
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)

    const jpegBase64 = canvas.toDataURL('image/jpeg', 0.85)
    console.log('[heicConvert] libheif-js 转换成功，长度:', jpegBase64.length)
    return jpegBase64
  } catch (err) {
    console.error('[heicConvert] 方案1失败:', err)

    // 方案2：使用 heic2any 库
    try {
      console.log('[heicConvert] 尝试方案2: heic2any')
      const heic2any = (await import('heic2any')).default
      const result = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.85,
      })

      console.log('[heicConvert] heic2any 返回类型:', typeof result)

      // 处理返回结果
      let blob: Blob | null = null

      if (Array.isArray(result)) {
        blob = result[0] as Blob
      } else if (result instanceof Blob) {
        blob = result
      }

      if (!blob) {
        throw new Error('无法获取转换后的图片数据')
      }

      console.log('[heicConvert] Blob 信息:', blob.size, 'bytes,', blob.type)

      // 将 Blob 转换为 base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob!)
      })

      console.log('[heicConvert] 方案2转换成功，长度:', base64.length)
      return base64
    } catch (err2) {
      console.error('[heicConvert] 方案2失败:', err2)
      throw new Error('您的照片格式暂不支持（ERR_LIBHEIF format not supported）。请在 iPhone 上将照片另存为 JPG 格式后重试。')
    }
  }
}
