// ============================================================
// resetTestData — 重置测试数据云函数
//
// 目标：清空 coach_members 表 + 重置关键用户的 name/avatar
// 让测试环境干干净净
//
// 执行：tcb fn run --name resetTestData
// ============================================================
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 要清理的邀请码列表
const TEST_INVITE_CODES = ['M-NNC1M0', 'M-S89000', 'M-YIWWRB', 'C-7L2000', 'C-8PTMHO']

exports.main = async (event, context) => {
  const result = {
    coachMembersDeleted: 0,
    usersReset: 0,
  }

  // 1. 删除所有 coach_members 记录（测试期间产生的绑定关系）
  try {
    // 分批删除（CloudBase 单次限制）
    let hasMore = true
    while (hasMore) {
      const rels = await db.collection('coach_members')
        .where({ status: 'active' })
        .limit(10)
        .get()
      
      if (!rels.data || rels.data.length === 0) {
        hasMore = false
        break
      }

      const ids = rels.data.map(r => r._id)
      for (const id of ids) {
        await db.collection('coach_members').doc(id).remove()
        result.coachMembersDeleted++
      }
    }
  } catch (e) {
    console.error('删除 coach_members 失败:', e)
  }

  // 2. 重置测试邀请码对应的用户 name 和 avatar
  for (const code of TEST_INVITE_CODES) {
    try {
      const users = await db.collection('users')
        .where({ invite_code: code })
        .limit(1)
        .get()

      if (users.data && users.data.length > 0) {
        const user = users.data[0]
        const defaultName = code.startsWith('C-') 
          ? `教练${code}` 
          : `会员${code}`
        
        await db.collection('users').doc(user._id).update({
          data: {
            name: defaultName,
            avatar: null,
            phone: '',
            updated_at: db.serverDate(),
          },
        })
        result.usersReset++
        console.log(`已重置 ${code}: ${user._id} → ${defaultName}`)
      }
    } catch (e) {
      console.error(`重置 ${code} 失败:`, e)
    }
  }

  // 3. 删除测试用户的所有饮食/运动/体成分记录（可选）
  // 暂时不删，只重置基本信息

  return result
}
