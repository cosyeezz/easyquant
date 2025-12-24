import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

function Modal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'default', 
  onConfirm,
  children,
  confirmText = '确认',
  cancelText = '取消',
  confirmDisabled = false,
  showConfirm = true
}) {
  if (!isOpen) return null

  const icons = {
    success: <CheckCircle className="w-12 h-12 text-success-500" />,
    error: <AlertCircle className="w-12 h-12 text-danger-500" />,
    warning: <AlertTriangle className="w-12 h-12 text-warning-500" />,
    info: <Info className="w-12 h-12 text-primary-500" />,
    default: null
  }

  const bgColors = {
    success: 'bg-success-50',
    error: 'bg-danger-50',
    warning: 'bg-warning-50',
    info: 'bg-primary-50',
    default: 'bg-slate-50'
  }

  const buttonColors = {
    success: 'bg-success-600 hover:bg-success-700 focus:ring-success-500',
    error: 'bg-danger-600 hover:bg-danger-700 focus:ring-danger-500',
    warning: 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500',
    info: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    default: 'bg-eq-primary-600 hover:bg-eq-primary-700 focus:ring-eq-primary-500'
  }
  
  // Resolve button color based on type, fallback to default if type key doesn't exist
  const confirmBtnColor = buttonColors[type] || buttonColors.default;
  const isMessageMode = !children;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative bg-white dark:bg-eq-bg-surface rounded-xl shadow-2xl w-full transform transition-all animate-slideUp border border-eq-border-subtle ${isMessageMode ? 'max-w-md' : 'max-w-lg'}`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-eq-text-muted hover:text-eq-text-primary transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {isMessageMode ? (
          // --- Legacy Message Mode (Centered, with Icon) ---
          <div className="p-8 text-center">
            {type !== 'default' && icons[type] && (
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${bgColors[type]} mb-4`}>
                    {icons[type]}
                </div>
            )}

            {title && (
              <h3 className="text-xl font-bold text-eq-text-primary mb-3">
                {title}
              </h3>
            )}

            <p className="text-eq-text-secondary text-base leading-relaxed mb-6">
              {message}
            </p>

            <div className="flex gap-3 justify-center">
              {onConfirm ? (
                <>
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-eq-bg-elevated text-eq-text-secondary rounded-lg font-medium hover:bg-eq-bg-overlay transition-colors"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={() => {
                      onConfirm()
                      onClose()
                    }}
                    className={`px-6 py-2.5 text-white rounded-lg font-medium transition-all ${confirmBtnColor} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  >
                    {confirmText}
                  </button>
                </>
              ) : (
                <button
                  onClick={onClose}
                  className={`px-8 py-2.5 text-white rounded-lg font-medium transition-all ${confirmBtnColor} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  知道了
                </button>
              )}
            </div>
          </div>
        ) : (
          // --- Content Mode (Left-aligned, for Forms) ---
          <div className="flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-eq-border-subtle flex items-center justify-between">
                 <h3 className="text-lg font-bold text-eq-text-primary">{title}</h3>
              </div>
              
              <div className="p-6 overflow-y-auto">
                {children}
              </div>

              {showConfirm && (
                <div className="px-6 py-4 border-t border-eq-border-subtle bg-eq-bg-elevated/30 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-eq-text-secondary bg-white dark:bg-eq-bg-elevated border border-eq-border-default rounded-md hover:bg-eq-bg-overlay transition-colors"
                    >
                        {cancelText}
                    </button>
                    {onConfirm && (
                        <button
                            onClick={onConfirm}
                            disabled={confirmDisabled}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-all ${confirmBtnColor} focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm flex items-center gap-2 ${confirmDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {confirmText}
                        </button>
                    )}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
