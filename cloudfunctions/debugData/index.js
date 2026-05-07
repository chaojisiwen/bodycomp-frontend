// ============================================================
// debugData — 调试数据分析云函数
// 执行：tcb fn run --name debugData
// 查看 coach_members、coaches、users 三表关联情况
// ============================================================
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const result = {
    coachMembers: [],
    coaches: [],
    users: [],
    analysis: [],
  }

  // 1. 所有 coach_members
  const rels = await db.collection('coach_members').limit(50).get()
  result.coachMembers = rels.data.map(r => ({
    _id: r._id,
    coach_id: r.coach_id,
    member_id: r.member_id,
    status: r.status,
    invite_code: r.invite_code || '(无)',
  }))

  // 2. 所有 coaches
  const coaches = await db.collection('coaches').limit(50).get()
  result.coaches = coaches.data.map(c => ({
    _id: c._id,
    user_id: c.user_id || '(无)',
    name: c.name || c.title || '(无)',
    invite_code: c.invite_code || '(无)',
  }))

  // 3. 有 invite_code 的 users
  const users = await db.collection('users').where({ invite_code: _.exists(true) }).limit(50).get()
  result.users = users.data.map(u => ({
    _id: u._id,
    uid: u.uid || '(无)',
    name: u.name || '(无)',
    invite_code: u.invite_code,
  }))

  // 4. 分析：对每个 coach_members.member_id，检查 users 表能否匹配
  for (const rel of rels.data) {
    const mid = rel.member_id
    const userBy_id = users.data.find(u => u._id === mid)
    const userByUid = users.data.find(u => u.uid === mid)
    const userByInvite = users.data.find(u => u.invite_code === rel.invite_code)
    
    const matchedBy = userBy_id ? '_id' : userByUid ? 'uid' : userByInvite ? 'invite_code' : '❌ 无匹配'
    result.analysis.push({
      member_id: mid,
      member_name: (userBy_id || userByUid || userByInvite)?.name || '(无)',
      matchedBy,
      coach_id: rel.coach_id,
    })
  }

  return result
}
