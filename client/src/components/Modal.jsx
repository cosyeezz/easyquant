import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

function Modal({ isOpen, onClose, title, message, type = 'success', onConfirm }) {
  if (!isOpen) return null

  const icons = {
    success: <CheckCircle className="w-12 h-12 text-success-500" />,
    error: <AlertCircle className="w-12 h-12 text-danger-500" />,
    warning: <AlertTriangle className="w-12 h-12 text-warning-500" />,
    info: <Info className="w-12 h-12 text-primary-500" />,
  }

  const bgColors = {
    success: 'bg-success-50',
    error: 'bg-danger-50',
    warning: 'bg-warning-50',
    info: 'bg-primary-50',
  }

  const buttonColors = {
    success: 'bg-success-600 hover:bg-success-700 focus:ring-success-500',
    error: 'bg-danger-600 hover:bg-danger-700 focus:ring-danger-500',
    warning: 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500',
    info: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 模态框内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-slideUp">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 内容区域 */}
        <div className="p-8 text-center">
          {/* 图标 */}
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${bgColors[type]} mb-4`}>
            {icons[type]}
          </div>

          {/* 标题 */}
          {title && (
            <h3 className="text-2xl font-bold text-slate-800 mb-3">
              {title}
            </h3>
          )}

          {/* 消息 */}
          <p className="text-slate-600 text-base leading-relaxed mb-6">
            {message}
          </p>

          {/* 按钮 */}
          <div className="flex gap-3 justify-center">
            {onConfirm ? (
              <>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                  className={`px-6 py-2.5 text-white rounded-lg font-medium transition-all ${buttonColors[type]} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  确认
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className={`px-8 py-2.5 text-white rounded-lg font-medium transition-all ${buttonColors[type]} focus:outline-none focus:ring-2 focus:ring-offset-2`}
              >
                知道了
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modal
