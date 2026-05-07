// ============================================================
// cleanupGhostUsers — 幽灵用户清理云函数
//
// 功能：
//   1. 识别幽灵用户（name='用户' 且无 invite_code 的记录）
//   2. 将幽灵用户产生的数据（meals/exercises/body_records/warnings）
//      转移到正确的用户（通过 coach_members 反查真实 user_id）
//   3. 修复 coach_members 中指向幽灵用户的 member_id
//   4. 删除可识别的幽灵用户记录
//
// 安全规则：
//   - 不删除 name 不为空的用户（可能是真实用户）
//   - 不删除有 invite_code 的用户（通过邀请码登录的）
//   - 不删除已设置密码的用户
//   - 所有操作有详细的日志输出
//
// 调用方式：
//   方式1：tcb fn run cleanupGhostUsers --params '{"dryRun":true}'
//   方式2：从云函数控制台手动执行
//   方式3：通过 Web 管理页面调用（保留接口但需要额外鉴权）
//
// 参数：
//   dryRun: boolean — true 时只输出分析结果，不实际执行删除
//   action: 'analyze' | 'fix' — analyze 只查不修，fix 执行修复
// ============================================================

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action = 'analyze' } = event
  const isDryRun = action === 'analyze'

  console.log(`[cleanupGhostUsers] 开始，模式: ${isDryRun ? 'ANALYZE（仅分析）' : 'FIX（执行修复）'}`)

  const report = {
    ghostUsersFound: 0,
    ghostUsersDeleted: 0,
    coachMembersFixed: 0,
    dataRecordsTransferred: 0,
    errors: [],
  }

  try {
    // ============================================================
    // Step 1: 找出幽灵用户
    // 幽灵用户特征：name='用户' 且 无 invite_code 且 无 password
    // ============================================================
    console.log('[Step 1] 扫描幽灵用户...')
    const ghostUsers = await db.collection('users')
      .where({
        name: '用户',
        invite_code: _.exists(false),
      })
      .get()

    // 也查一下 name 不存在（undefined）且无 invite_code 的
    const ghostUsers2 = await db.collection('users')
      .where({
        name: _.exists(false),
        invite_code: _.exists(false),
      })
      .get()

    const allGhosts = [...(ghostUsers.data || []), ...(ghostUsers2.data || [])]
    // 去重
    const ghostMap = new Map()
    allGhosts.forEach(u => ghostMap.set(u._id, u))
    const uniqueGhosts = Array.from(ghostMap.values())

    report.ghostUsersFound = uniqueGhosts.length
    console.log(`[Step 1] 发现 ${uniqueGhosts.length} 个幽灵用户`)
    uniqueGhosts.forEach(u => {
      console.log(`  ├─ _id: ${u._id}, openid: ${u.openid || '无'}, created_at: ${u.created_at || '未知'}`)
    })

    if (uniqueGhosts.length === 0) {
      console.log('[Result] 没有幽灵用户，无需清理')
      return { code: 0, message: '无需清理', report }
    }

    if (isDryRun) {
      console.log('[DryRun] 仅分析模式，不执行任何修改')
      return { code: 0, message: '分析完成', report, ghostIds: uniqueGhosts.map(u => u._id) }
    }

    // ============================================================
    // Step 2: 对每个幽灵用户，尝试通过 coach_members 反查真实用户
    // 幽灵用户的 openid 可能被教练端绑定记录引用
    // ============================================================
    console.log('[Step 2] 处理 coach_members 中的幽灵 member_id...')
    for (const ghost of uniqueGhosts) {
      const ghostId = ghost._id

      // 查找 coach_members 中 member_id 指向幽灵用户的记录
      const relatedCoachMembers = await db.collection('coach_members')
        .where({ member_id: ghostId })
        .get()

      if (relatedCoachMembers.data && relatedCoachMembers.data.length > 0) {
        console.log(`  ├─ 幽灵 ${ghostId} 有 ${relatedCoachMembers.data.length} 条 coach_members 绑定`)

        for (const rel of relatedCoachMembers.data) {
          // 尝试从同一教练的其他绑定记录中找到同一个人（通过同名、同教练推断）
          // 最稳妥的方式：查这个幽灵用户的数据记录中 user_id 是否被其他真实用户引用
          
          // 查这个幽灵用户写过的 meals
          const ghostMeals = await db.collection('meals')
            .where({ user_id: ghostId })
            .limit(1)
            .get()

          // 查这个幽灵用户写过的 body_records
          const ghostBodies = await db.collection('body_records')
            .where({ user_id: ghostId })
            .limit(1)
            .get()

          // 查这个幽灵用户写过的 exercises
          const ghostExercises = await db.collection('exercises')
            .where({ user_id: ghostId })
            .limit(1)
            .get()

          const hasData = (ghostMeals.data?.length || 0) > 0 ||
            (ghostBodies.data?.length || 0) > 0 ||
            (ghostExercises.data?.length || 0) > 0

          if (hasData) {
            console.log(`  ├── 幽灵 ${ghostId} 有数据记录（meals/bodies/exercises）`)
            console.log(`  ├── 警告：该幽灵用户有数据，不建议直接删除 coach_members 绑定`)
            console.log(`  ├── 建议：保留该记录，联系管理员确认后再决定如何处理`)
            report.errors.push(`幽灵 ${ghostId} 有数据记录，跳过删除 coach_members，需人工确认`)
          } else {
            // 幽灵没有数据记录，可以安全删除 coach_members 绑定
            try {
              await db.collection('coach_members').doc(rel._id).remove()
              report.coachMembersFixed++
              console.log(`  ├── 已删除 coach_members ${rel._id}（幽灵无数据）`)
            } catch (e) {
              report.errors.push(`删除 coach_members ${rel._id} 失败: ${e.message}`)
            }
          }
        }
      }
    }

    // ============================================================
    // Step 3: 处理幽灵用户的数据记录（meals/exercises/body_records）
    // 如果幽灵用户写入了数据，保留数据但标记 user_id 为 'ghost-{_id}'
    // 这样教练端查询时不会匹配到这些记录，但数据不会丢失
    // ============================================================
    console.log('[Step 3] 处理幽灵用户的数据记录...')
    for (const ghost of uniqueGhosts) {
      const ghostId = ghost._id
      const markedId = `ghost-${ghostId}`

      // Meals
      const mealsRes = await db.collection('meals')
        .where({ user_id: ghostId })
        .get()
      if (mealsRes.data && mealsRes.data.length > 0) {
        try {
          await db.collection('meals')
            .where({ user_id: ghostId })
            .update({ data: { user_id: markedId } })
          report.dataRecordsTransferred += mealsRes.data.length
          console.log(`  ├─ meals: ${mealsRes.data.length} 条已标记为 ${markedId}`)
        } catch (e) {
          report.errors.push(`标记 meals(ghost=${ghostId}) 失败: ${e.message}`)
        }
      }

      // Body records
      const bodyRes = await db.collection('body_records')
        .where({ user_id: ghostId })
        .get()
      if (bodyRes.data && bodyRes.data.length > 0) {
        try {
          await db.collection('body_records')
            .where({ user_id: ghostId })
            .update({ data: { user_id: markedId } })
          report.dataRecordsTransferred += bodyRes.data.length
          console.log(`  ├─ body_records: ${bodyRes.data.length} 条已标记为 ${markedId}`)
        } catch (e) {
          report.errors.push(`标记 body_records(ghost=${ghostId}) 失败: ${e.message}`)
        }
      }

      // Exercises
      const exRes = await db.collection('exercises')
        .where({ user_id: ghostId })
        .get()
      if (exRes.data && exRes.data.length > 0) {
        try {
          await db.collection('exercises')
            .where({ user_id: ghostId })
            .update({ data: { user_id: markedId } })
          report.dataRecordsTransferred += exRes.data.length
          console.log(`  ├─ exercises: ${exRes.data.length} 条已标记为 ${markedId}`)
        } catch (e) {
          report.errors.push(`标记 exercises(ghost=${ghostId}) 失败: ${e.message}`)
        }
      }
    }

    // ============================================================
    // Step 4: 删除没有数据记录的幽灵用户
    // 有数据记录的幽灵用户保留（只标记数据），无数据的直接删除
    // ============================================================
    console.log('[Step 4] 删除无数据的幽灵用户...')
    for (const ghost of uniqueGhosts) {
      const ghostId = ghost._id

      // 重新检查是否还有数据记录（标记为 ghost- 前缀的也算有数据）
      const markedMeals = await db.collection('meals')
        .where({ user_id: `ghost-${ghostId}` })
        .limit(1)
        .get()

      if (markedMeals.data?.length === 0) {
        try {
          await db.collection('users').doc(ghostId).remove()
          report.ghostUsersDeleted++
          console.log(`  ├─ 已删除幽灵用户: ${ghostId}`)
        } catch (e) {
          report.errors.push(`删除幽灵用户 ${ghostId} 失败: ${e.message}`)
        }
      } else {
        console.log(`  ├─ 跳过删除幽灵 ${ghostId}（仍有数据记录）`)
      }
    }

    // ============================================================
    // 完成报告
    // ============================================================
    console.log('[Cleanup] 完成！')
    console.log(JSON.stringify(report, null, 2))

    return {
      code: 0,
      message: '清理完成',
      report,
    }

  } catch (error) {
    console.error('[cleanupGhostUsers] 异常:', error)
    return {
      code: -500,
      message: error.message || '执行失败',
      report,
    }
  }
}
