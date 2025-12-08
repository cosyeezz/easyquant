import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export default function Select({ 
  value, 
  onChange, 
  options = [], 
  placeholder = '请选择', 
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // 获取当前显示的 Label
  const selectedOption = options.find(opt => opt.value === value)
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (val) => {
    onChange(val)
    setIsOpen(false)
  }

  return (
    <div 
      className={`relative ${className}`} 
      ref={containerRef}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-3 py-2 text-left bg-white border rounded-lg shadow-sm transition-all
          ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'hover:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:border-primary-500 cursor-pointer'}
          ${isOpen ? 'border-primary-500 ring-2 ring-primary-100' : 'border-slate-300'}
        `}
      >
        <span className={`block truncate ${!selectedOption ? 'text-slate-400' : 'text-slate-700'}`}>
          {displayLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-auto animate-fadeIn">
          <ul className="py-1">
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400 text-center">无选项</li>
            ) : (
              options.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 text-sm transition-colors
                      ${opt.value === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-700 hover:bg-slate-50 hover:text-primary-600'}
                    `}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.value === value && <Check className="w-4 h-4 text-primary-600" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
