import { useRef } from 'react'
import { X, Camera, Upload } from 'lucide-react'

interface BodyCameraModalProps {
  visible: boolean
  onClose: () => void
  onStartCamera: () => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function BodyCameraModal({
  visible,
  onClose,
  onStartCamera,
  onFileUpload,
}: BodyCameraModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end pb-[144px]">
      <div className="w-full bg-gray-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">AI拍照识别</h3>
          <button onClick={onClose} className="text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-4">
          拍摄或上传体成分检测仪/智能秤的屏幕照片，AI将自动识别并提取数据
        </p>

        {/* 隐藏的文件输入 */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={onFileUpload}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-4">
          {/* 拍照 */}
          <button
            onClick={onStartCamera}
            className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-purple-500/30 flex items-center justify-center">
              <Camera className="w-8 h-8 text-purple-400" />
            </div>
            <span className="font-medium">拍照识别</span>
            <span className="text-xs text-gray-400">使用相机拍摄</span>
          </button>

          {/* 从相册选择 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-pink-500/30 flex items-center justify-center">
              <Upload className="w-8 h-8 text-pink-400" />
            </div>
            <span className="font-medium">相册导入</span>
            <span className="text-xs text-gray-400">选择已有图片</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  )
}


export default BodyCameraModal
