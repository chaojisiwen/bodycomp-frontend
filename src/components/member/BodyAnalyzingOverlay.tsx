interface BodyAnalyzingOverlayProps {
  visible: boolean
}

function BodyAnalyzingOverlay({ visible }: BodyAnalyzingOverlayProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-2xl p-8 text-center max-w-xs mx-4">
        <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto mb-4" />
        <h3 className="font-semibold mb-2">AI正在分析...</h3>
        <p className="text-sm text-gray-400">请稍候，正在识别体成分数据</p>
      </div>
    </div>
  )
}


export default BodyAnalyzingOverlay
