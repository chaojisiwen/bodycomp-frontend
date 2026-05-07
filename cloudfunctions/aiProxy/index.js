// ============================================================
// AI 代理云函数
//
// 功能：在服务端转发 AI API 请求，解决 COS 静态托管无法代理的问题
// 
// 支持的 action：
//   - hunyuan: 转发到腾讯混元 API（https://api.hunyuan.cloud.tencent.com）
//   - baidu-token: 获取百度访问令牌
//   - baidu-recognize: 调用百度菜品识别 API
// ============================================================

const https = require('https')
const http = require('http')

/**
 * 发送 HTTPS 请求
 */
function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const req = https.request(
      {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'POST',
        headers: {
          ...(options.headers || {}),
          'Content-Type': 'application/json',
        },
        timeout: 50000,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: data,
            })
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')) })
    if (body) req.write(body)
    req.end()
  })
}

/**
 * 代理混元 API 请求
 */
async function proxyHunyuan(data) {
  const { payload, apiKey } = data

  if (!apiKey) {
    return { success: false, error: '缺少 API Key' }
  }

  if (!payload) {
    return { success: false, error: '缺少请求内容' }
  }

  const HUNYUAN_URL = 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions'

  console.log('[aiProxy/hunyuan] 转发请求到混元 API...')

  const resp = await httpsRequest(HUNYUAN_URL, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  }, JSON.stringify(payload))

  console.log('[aiProxy/hunyuan] 混元 API 响应状态:', resp.status)

  if (resp.status !== 200) {
    return {
      success: false,
      error: `混元 API 返回错误: ${resp.status}`,
      rawResponse: resp.data,
    }
  }

  // 直接返回混元 API 的原始响应体
  try {
    return {
      success: true,
      data: JSON.parse(resp.data),
    }
  } catch (e) {
    return {
      success: false,
      error: '解析混元响应失败',
      rawResponse: resp.data,
    }
  }
}

/**
 * 主入口
 */
exports.main = async (event) => {
  const { action, data } = event

  console.log('[aiProxy] 收到请求, action:', action)

  try {
    switch (action) {
      case 'hunyuan':
        return await proxyHunyuan(data)
      default:
        return { success: false, error: `未知 action: ${action}` }
    }
  } catch (error) {
    console.error('[aiProxy] 处理异常:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '请求处理异常',
    }
  }
}
