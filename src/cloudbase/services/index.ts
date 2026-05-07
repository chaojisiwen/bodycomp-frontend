/**
 * 云开发服务导出
 */

// 初始化
export { initCloudbase, getApp, getAuth, getDatabase, CLOUDBASE_CONFIG, COLLECTIONS } from '../index'

// 工具函数
export { getCurrentUserId } from './utils'

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
  updateCurrentUserProfile,
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
  bindCoach,
  unbindCoach,
  getMyCoach,
  getCoachMembers,
  getCoachMemberList,
  getMemberProfile,
  getCoachProfile,
  updateCoachProfile,
  assignPlan,
  getMemberAssignedPlans,
  saveMemberPlanNotes,
  getMemberMeals,
  getMemberExercises,
  getMemberBodyRecords,
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

// AI 识别服务
export {
  recognizeFood,
  calibrateFist,
  calculateTotalCalories,
  calculateTotalNutrition,
  recognizeBodyComposition,
  recognizeExercise,
} from './recognize'
export type {
  FistCalibration,
  RecognizedFoodItem,
  RecognizeAnalysis,
  RecognizeResult,
  AIConfig,
  FistCalibrationResult,
  BodyCompositionResult,
  BodyRecognizeResult,
  ExerciseItemResult,
  ExerciseRecognizeResult,
} from './recognize'
