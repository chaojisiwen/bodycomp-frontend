import { useState, useEffect } from 'react'
import { BottomModal } from '@/components/common/BottomModal'
import { updateCoachProfile } from '@/cloudbase/services/coach'
import { useCoachProfileStore } from '@/stores/coachProfileStore'

interface CoachEditProfileModalProps {
  open: boolean
  onClose: () => void
  coachName: string
  coachPhone: string
  coachBio: string
  coachId: string
}

export function CoachEditProfileModal({
  open,
  onClose,
  coachName,
  coachPhone,
  coachBio,
  coachId,
}: CoachEditProfileModalProps) {
  const { updateProfile } = useCoachProfileStore()
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: coachName,
    phone: coachPhone,
    intro: coachBio,
  })

  // 弹窗打开时用最新 profile 初始化表单
  useEffect(() => {
    if (open) {
      setForm({ name: coachName, phone: coachPhone, intro: coachBio })
    }
  }, [open, coachName, coachPhone, coachBio])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 1. 写入 CloudBase（修复：原来根本没写）
      const res = await updateCoachProfile({
        name: form.name,
        phone: form.phone,
        bio: form.intro,
      })
      if (!res.success) throw new Error(res.error)

      // 2. 更新本地 Store，UI 立即反映
      updateProfile({
        name: form.name,
        phone: form.phone,
        bio: form.intro,
      })

      onClose()
      setToast('保存成功')
      setTimeout(() => setToast(null), 2000)
    } catch (e) {
      console.error('[CoachEditProfile] 保存失败:', e)
      setToast('保存失败，请重试')
      setTimeout(() => setToast(null), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      <BottomModal open={open} onClose={onClose} title="编辑资料">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">姓名</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-slate-900 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">联系电话</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full bg-slate-900 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">个人简介</label>
            <textarea
              value={form.intro}
              onChange={e => setForm(p => ({ ...p, intro: e.target.value }))}
              rows={3}
              className="w-full bg-slate-900 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </BottomModal>
    </>
  )
}
