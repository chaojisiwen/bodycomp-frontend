import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Users, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { coachApi } from '@/services/api'

// 生成首字母头像
function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const colors = [
    'bg-gradient-to-br from-emerald-400 to-teal-500',
    'bg-gradient-to-br from-blue-400 to-indigo-500',
    'bg-gradient-to-br from-purple-400 to-pink-500',
    'bg-gradient-to-br from-orange-400 to-red-500',
    'bg-gradient-to-br from-yellow-400 to-orange-500',
  ]
  const initial = name ? name.charAt(0).toUpperCase() : '?'
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0
  return (
    <div
      className={`${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-bold`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  )
}

interface Member {
  id: string
  name: string
  avatar: string
  goal: string
  week: number
  status: 'normal' | 'warning' | 'danger' | 'inactive'
  statusText: string
  weight: number
  fat: number
  lastUpdate: string
  hasPlan: boolean
  joinDate: string
}

export function CoachMemberListPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    coachApi.getMyMembers().then(res => {
      if (res.success && res.data) {
        // 直接使用 API 返回的真实数据
        setMembers(res.data.map(m => ({
          id: m.id,
          name: m.name || '未知用户',
          avatar: m.avatar || '',
          goal: m.goal || '维持',
          week: m.week || 1,
          status: m.warnings === 0 ? 'normal' : m.warnings === 1 ? 'warning' : 'danger',
          statusText: m.warnings === 0 ? '正常' : m.warnings === 1 ? '轻微偏离' : '严重偏离',
          weight: m.weight || 0,
          fat: m.bodyFat || 0,
          lastUpdate: m.lastRecord || '暂无记录',
          hasPlan: m.hasPlan ?? false,
          joinDate: m.joinDate || '',
        })))
      }
      setLoading(false)
    })
  }, [])

  const filters = [
    { id: 'all', name: '全部会员' },
    { id: 'fat-loss', name: '减脂中' },
    { id: 'muscle', name: '增肌中' },
    { id: 'maintain', name: '维持中' },
    { id: 'warning', name: '偏离' },
  ]

  const getStatusBadge = (status: string, text: string) => {
    const styles: Record<string, string> = {
      danger: 'bg-red-500/20 text-red-400',
      warning: 'bg-yellow-500/20 text-yellow-400',
      normal: 'bg-emerald-500/20 text-emerald-400',
      inactive: 'bg-gray-500/20 text-gray-400',
    }
    return <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>{text}</span>
  }

  const getStatusDot = (status: string) => {
    const colors: Record<string, string> = {
      danger: 'bg-red-500',
      warning: 'bg-yellow-500',
      normal: 'bg-emerald-500',
      inactive: 'bg-gray-500',
    }
    return <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  const filteredMembers = members.filter(member => {
    if (searchQuery && !member.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (activeFilter === 'warning' && member.status !== 'danger' && member.status !== 'warning') {
      return false
    }
    // 按目标筛选
    if (activeFilter === 'fat-loss' && member.goal !== '减脂') {
      return false
    }
    if (activeFilter === 'muscle' && member.goal !== '增肌') {
      return false
    }
    if (activeFilter === 'maintain' && member.goal !== '维持') {
      return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索会员..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>
        <button className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <Filter className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* 筛选标签 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              activeFilter === filter.id
                ? 'bg-emerald-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {filter.name}
          </button>
        ))}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <Users className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-lg font-bold">{members.length}</p>
          <p className="text-xs text-gray-400">全部会员</p>
        </Card>
        <Card className="p-3 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-lg font-bold">{members.filter(m => m.status === 'normal').length}</p>
          <p className="text-xs text-gray-400">正常</p>
        </Card>
        <Card className="p-3 text-center">
          <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="text-lg font-bold">{members.filter(m => m.status === 'danger' || m.status === 'warning').length}</p>
          <p className="text-xs text-gray-400">偏离</p>
        </Card>
      </div>

      {/* 会员列表 */}
      <div className="space-y-3 pb-6">
        {filteredMembers.map(member => (
          <Card key={member.id} className="p-4 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate(`/coach/members/${member.id}`)}>
            <div className="flex items-center gap-3 mb-3">
              {member.avatar ? (
                <img src={member.avatar} alt="" className="w-12 h-12 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }} />
              ) : null}
              <div className={`rounded-full ${member.avatar ? 'hidden' : ''}`}>
                <Avatar name={member.name} size={48} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{member.name}</p>
                  {getStatusDot(member.status)}
                </div>
                <p className="text-sm text-gray-400">{member.goal} · 第{member.week}周</p>
              </div>
              {getStatusBadge(member.status, member.statusText)}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-sm font-semibold">{member.weight > 0 ? `${member.weight}kg` : '暂无'}</p>
                <p className="text-xs text-gray-500">体重</p>
              </div>
              <div className={`rounded-lg p-2 ${member.status === 'danger' ? 'bg-red-500/10' : member.status === 'warning' ? 'bg-yellow-500/10' : 'bg-white/5'}`}>
                <p className={`text-sm font-semibold ${member.status === 'danger' ? 'text-red-400' : member.status === 'warning' ? 'text-yellow-400' : ''}`}>
                  {member.fat > 0 ? `${member.fat}%` : '暂无'}
                </p>
                <p className="text-xs text-gray-500">体脂率</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-sm font-semibold">{member.lastUpdate}</p>
                <p className="text-xs text-gray-500">更新时间</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
