/**
 * 状态管理导出
 */

export { useBodyStore, useLatestBodyRecord, useBodyTrend } from './bodyStore'
export { useMealStore, useTodayCalories, useTodayMealsByType, useWeekCalories } from './mealStore'
export { useExerciseStore, useTodayDuration, useTodayCaloriesBurned, useWeekExerciseStats } from './exerciseStore'
export { useRecognizeStore, useTodayRecognitionCount, useLatestRecognition, type RecognizedFoodItem, type RecognitionRecord, type RecognizeAnalysis } from './recognizeStore'
export { useNotificationStore, type Notification } from './notificationStore'
export { useProfileStore, useDisplayName, useAvatarText } from './profileStore'
export { useWarningStore, useFilteredWarnings, useWarningStats } from './warningStore'
export { usePlanStore, useFilteredPlans, usePlanCountByType } from './planStore'
