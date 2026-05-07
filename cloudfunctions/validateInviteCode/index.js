// ============================================================
// ⚠️ 登录核心文件 - 修改需谨慎
// 本文件属于系统认证链路的关键环节
// 修改前请确认了解：登录流程、路由守卫、AuthContext 三者关系
// 关键约束：
//   - 入参格式必须与 LoginPage.tsx 中 callCloudFunction 调用保持一致
//   - 返回体中的 code/message/data 结构是前端判断的唯一依据
//   - 禁止调用 wx-server-sdk 中不存在的 API（如 cloud.auth()）
//   - 密码哈希算法变更需同步更新前端（如有校验逻辑）
// ============================================================

/**
 * validateInviteCode - 邀请码验证云函数
 *
 * 功能：
 * 1. 校验邀请码有效性
 * 2. 支持密码登录
 * 3. 支持首次登录设置密码
 * 4. 返回 token 供前端登录
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

// 主入口
exports.main = async (event, context) => {
  const { action, code, password } = event
  const normalizedCode = (code || '').trim().toUpperCase()

  console.log('[validateInviteCode] 收到请求:', { action, code: normalizedCode })

  if (!normalizedCode) {
    return { code: -1, message: '邀请码不能为空' }
  }

  try {
    // 查询 users 集合中 invite_code 匹配的用户
    const userRes = await db
      .collection('users')
      .where({
        invite_code: normalizedCode,
      })
      .limit(1)
      .get()

    let user = null
    if (userRes.data && userRes.data.length > 0) {
      user = userRes.data[0]
    }

    // action: setPassword - 首次设置密码
    if (action === 'setPassword') {
      if (!password || password.length < 6) {
        return { code: -1, message: '密码至少6位' }
      }

      if (!user) {
        return { code: -1, message: '邀请码无效' }
      }

      // 更新密码
      await db
        .collection('users')
        .doc(user._id)
        .update({
          data: {
            password: hashPassword(password),
            updated_at: db.serverDate(),
          },
        })

      // 生成登录 token（简单实现，生产环境建议用 JWT）
      const token = generateToken(user._id)

      return {
        code: 0,
        message: '密码设置成功',
        data: {
          token,
          role: user.role || 'member',
          uid: user._id,
          name: user.name || '用户',
          userId: user._id,
          isFirstLogin: false,
        },
      }
    }

    // action: login - 正常登录
    if (!user) {
      // 如果 invite_code 找不到，尝试用 _id 查找（兼容旧数据）
      const idRes = await db
        .collection('users')
        .doc(normalizedCode)
        .get()
        .catch(() => ({ data: null }))

      if (idRes && idRes.data) {
        user = idRes.data
      } else {
        return { code: -1, message: '邀请码无效' }
      }
    }

    // 检查是否需要设置密码（首次登录）
    if (!user.password) {
      return {
        code: -3,
        message: '首次登录，请设置密码',
        data: {
          role: user.role || 'member',
          uid: user._id,
          name: user.name || '用户',
          userId: user._id,
          isFirstLogin: true,
          needSetPassword: true,
        },
      }
    }

    // 需要密码但没有传
    if (!password) {
      return {
        code: -2,
        message: '请输入密码',
        data: {
          role: user.role || 'member',
          uid: user._id,
          name: user.name || '用户',
          userId: user._id,
          needPassword: true,
        },
      }
    }

    // 校验密码
    if (!verifyPassword(password, user.password)) {
      return { code: -1, message: '密码错误' }
    }

    // 登录成功，生成 token
    const token = generateToken(user._id)

    // 更新最后登录时间
    await db
      .collection('users')
      .doc(user._id)
      .update({
        data: {
          last_login_at: db.serverDate(),
          updated_at: db.serverDate(),
        },
      })
      .catch(() => {})

    return {
      code: 0,
      message: '登录成功',
      data: {
        token,
        role: user.role || 'member',
        uid: user._id,
        name: user.name || '用户',
        userId: user._id,
        isFirstLogin: false,
      },
    }
  } catch (error) {
    console.error('[validateInviteCode] 异常:', error)
    return { code: -500, message: '服务器内部错误，请稍后再试' }
  }
}

// 简单密码哈希（实际项目建议用 bcrypt）
function hashPassword(pwd) {
  // 使用云函数环境内置的 crypto 做简单哈希
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(pwd + 'equilibrio-salt').digest('hex')
}

function verifyPassword(inputPwd, storedHash) {
  return hashPassword(inputPwd) === storedHash
}

// 生成简单登录 token
function generateToken(userId) {
  const crypto = require('crypto')
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2)
  return crypto.createHash('sha256').update(`${userId}-${timestamp}-${random}-equilibrio`).digest('hex')
}
