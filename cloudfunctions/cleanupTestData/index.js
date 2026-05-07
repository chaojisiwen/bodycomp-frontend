const cloud = require('@cloudbase/node-sdk')
const app = cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV || process.env.TCB_ENV_ID
})
const db = app.database()
const _ = db.command

exports.main = async () => {
  const results = {}

  // 1. 删除测试教练
  const coaches = await db.collection('coaches')
    .where(_.or([{ invite_code: 'C-7L2000' }, { invite_code: 'C-8PTMHO' }]))
    .get()
  results.coaches_found = coaches.data.length
  for (const c of coaches.data) {
    await db.collection('coaches').doc(c._id).remove()
  }
  results.coaches_deleted = coaches.data.length

  // 2. 清空 coach_members
  const rels = await db.collection('coach_members').get()
  results.relations_found = rels.data.length
  for (const r of rels.data) {
    await db.collection('coach_members').doc(r._id).remove()
  }
  results.relations_deleted = rels.data.length

  // 3. 清空 assigned_plans
  const plans = await db.collection('assigned_plans').get()
  results.plans_found = plans.data.length
  for (const p of plans.data) {
    await db.collection('assigned_plans').doc(p._id).remove()
  }
  results.plans_deleted = plans.data.length

  // 4. 清空 notifications
  const notifs = await db.collection('notifications').get()
  results.notifications_found = notifs.data.length
  for (const n of notifs.data) {
    await db.collection('notifications').doc(n._id).remove()
  }
  results.notifications_deleted = notifs.data.length

  return results
}
