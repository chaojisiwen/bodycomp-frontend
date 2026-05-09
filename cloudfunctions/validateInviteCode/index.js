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
 * 4. 首次登录自动创建用户记录（防止Mock模式下无用户记录的问题）
 * 5. 返回 token 供前端登录
 *
 * 邀请码格式：
 *   前缀 M- → role: member
 *   前缀 C- → role: coach
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

// 主入口
exports.main = async (event, context) => {
  const { action, code, password } = event
  const normalizedCode = (code || '').trim().toUpperCase()

  console.log('[validateInviteCode] 收到请求:', { action, code: normalizedCode })

  if (!normalizedCode) {
    return { code: -1, message: '邀请码不能为空' }
  }

  try {
    // ============================================================
    // Step 1: 查询用户（按 invite_code）
    // ============================================================
    let user = null
    let isNewUser = false

    const userRes = await db
      .collection('users')
      .where({ invite_code: normalizedCode })
      .limit(1)
      .get()

    if (userRes.data && userRes.data.length > 0) {
      user = userRes.data[0]
    } else {
      // ── 兜底：按 _id 查（兼容旧数据） ──
      const idRes = await db
        .collection('users')
        .doc(normalizedCode)
        .get()
        .catch(() => ({ data: null }))

      if (idRes && idRes.data) {
        user = idRes.data
      }
    }

    // ============================================================
    // Step 2: 用户不存在 → 自动创建
    // ============================================================
    if (!user) {
      const role = normalizedCode.startsWith('C-') ? 'coach' : 'member'
      const defaultName = role === 'coach' ? '教练' : '会员'

      console.log('[validateInviteCode] ⚠️ 用户不存在，自动创建:', {
        invite_code: normalizedCode,
        role,
      })

      const createResult = await db.collection('users').add({
        data: {
          invite_code: normalizedCode,
          role,
          name: defaultName,
          nickname: '',
          avatar: '',
          phone: '',
          password: '',
          target_weight: 0,
          created_at: db.serverDate(),
          updated_at: db.serverDate(),
          last_login_at: db.serverDate(),
        },
      })

      // 重新查询刚创建的记录以获取完整数据
      const newUserRes = await db
        .collection('users')
        .doc(createResult.id)
        .get()

      if (newUserRes.data) {
        user = newUserRes.data
        isNewUser = true
      } else {
        return { code: -500, message: '创建用户失败，请稍后重试' }
      }
    }

    // ============================================================
    // Step 3: 处理各种动作
    // ============================================================

    // ── setPassword: 首次设置密码 ──
    if (action === 'setPassword') {
      if (!password || password.length < 6) {
        return { code: -1, message: '密码至少6位' }
      }

      await db
        .collection('users')
        .doc(user._id)
        .update({
          data: {
            password: hashPassword(password),
            updated_at: db.serverDate(),
          },
        })

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
          isNewUser: true,
        },
      }
    }

    // ── login: 检查是否需要首次设置密码 ──
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
          isNewUser,
        },
      }
    }

    // ── 需要密码但没有传 ──
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

    // ── 校验密码 ──
    if (!verifyPassword(password, user.password)) {
      return { code: -1, message: '密码错误' }
    }

    // ── 登录成功 ──
    const token = generateToken(user._id)

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
