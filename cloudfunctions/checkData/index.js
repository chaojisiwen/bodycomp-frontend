const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  // 查所有 coaches
  const coaches = await db.collection('coaches').limit(20).get()
  // 查用户 C-7L2000
  const user = await db.collection('users').where({ invite_code: 'C-7L2000' }).get()
  return {
    coaches: coaches.data.map(c => ({ _id: c._id, user_id: c.user_id, name: c.name || c.title, invite_code: c.invite_code })),
    C_7L2000_user: user.data.map(u => ({ _id: u._id, uid: u.uid, name: u.name })),
  }
}
