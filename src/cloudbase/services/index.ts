/**
 * 云开发服务导出
 */

// 初始化
export { initCloudbase, getApp, getAuth, getDatabase, CLOUDBASE_CONFIG, COLLECTIONS } from '../index'

// 认证服务
export {
  loginWithWechat,
  loginWithPhone,
  loginAnonymously,
  sendPhoneCode,
  logout,
  getUserInfo,
  getCurrentUser,
  setCurrentUser,
  isLoggedIn,
} from './auth'

// 体成分服务
export {
  getBodyRecords,
  getBodyRecord,
  createBodyRecord,
  updateBodyRecord,
  deleteBodyRecord,
  getLatestBodyRecord,
  getBodyRecordTrend,
} from './bodyRecords'

// 饮食服务
export {
  getMeals,
  getMeal,
  createMeal,
  updateMeal,
  deleteMeal,
  getDailyMealSummary,
  getMealBreakdown,
  getCalorieTrend,
} from './meals'

// 运动服务
export {
  getExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
  getDailyExerciseSummary,
  getExerciseTrend,
  getBestDayOfWeek,
} from './exercises'

// 教练服务
export {
  getCoaches,
  getCoach,
  applyAsCoach,
  bindCoach,
  unbindCoach,
  getMyCoach,
  getCoachMembers,
} from './coach'

// 通知服务
export {
  sendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  createWarning,
  getCoachWarnings,
  handleWarning,
} from './notifications'
