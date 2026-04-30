import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface CoachMessageProps {
  hasCoach: boolean
  coachName: string
  content: string
  createdAt: string | number | Date
}

const CoachMessage = memo(function CoachMessage({ hasCoach, coachName, content, createdAt }: CoachMessageProps) {
  if (!hasCoach || !content) return null

  const getTimeAgo = () => {
    const diff = Date.now() - new Date(createdAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    return `${Math.floor(hours / 24)}天前`
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg">
            👨‍🏫
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{coachName}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                评语
              </span>
            </div>
            <p className="text-sm text-gray-300 mt-1">
              {content}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {getTimeAgo()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default CoachMessage
