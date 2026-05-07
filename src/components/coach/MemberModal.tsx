import { memo } from 'react'
import { ChevronRight } from 'lucide-react'
import { Drawer } from '@/components/common/Modal'

// 教练首页弹窗显示的会员信息类型
interface ModalMember {
  id: string
  name: string
  hasPlan?: boolean
  lastRecord?: string
}

// 弹窗组件
const MemberModal = memo(function MemberModal({
  open, title, members, loading, onClose, onMemberClick,
}: {
  open: boolean; title: string; members: ModalMember[]; loading: boolean; onClose: () => void; onMemberClick: (id: string) => void
}) {
  return (
    <Drawer open={open} onOpenChange={(val) => { if (!val) onClose() }} title={title} showClose>
      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无数据</div>
      ) : (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {members.map(m => (
            <button
              key={m.id}
              onClick={() => onMemberClick(m.id)}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors active:bg-white/5"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                {m.name ? m.name.charAt(0) : '?'}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-white">{m.name}</p>
                <p className="text-xs text-gray-500">
                  {m.hasPlan ? '有计划' : '待出计划'}
                  {m.lastRecord ? ` · 上次 ${m.lastRecord}` : ' · 暂无记录'}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          ))}
        </div>
      )}
    </Drawer>
  )
})

export default MemberModal
