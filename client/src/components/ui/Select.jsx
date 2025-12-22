import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'

export default function Select({ 
  value, 
  onChange, 
  options = [], 
  placeholder = '请选择', 
  disabled = false,
  className = '',
  clearable = false,
  onClear = () => {},
  size = 'md', // 'sm' | 'md'
  variant = 'solid' // 'solid' | 'ghost'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // 获取当前显示的 Label
  const selectedOption = options.find(opt => opt.value === value)
  const displayLabel = selectedOption ? selectedOption.label : placeholder
  
  const showClear = clearable && value && value !== 'all'

  // Size configurations
  const sizeStyles = {
      sm: {
          btn: 'px-2 py-1 text-xs h-[26px]', 
          icon: 'w-3.5 h-3.5',
          option: 'px-2 py-1.5 text-xs'
      },
      md: {
          btn: 'px-3 py-2 text-sm',
          icon: 'w-4 h-4',
          option: 'px-3 py-2 text-sm'
      }
  }
  const currentSize = sizeStyles[size] || sizeStyles.md

  // Variant configurations
  const variantStyles = {
      solid: disabled 
          ? 'bg-eq-bg-elevated text-eq-text-muted cursor-not-allowed border border-eq-border-subtle' 
          : 'bg-eq-bg-elevated hover:bg-eq-bg-overlay border border-eq-border-default hover:border-eq-border-strong text-eq-text-primary',
      ghost: disabled
          ? 'text-eq-text-muted cursor-not-allowed'
          : 'bg-transparent hover:bg-eq-bg-elevated text-eq-text-secondary hover:text-eq-text-primary border border-transparent'
  }
  const currentVariant = variantStyles[variant] || variantStyles.solid

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
  
  const handleClear = (e) => {
      e.stopPropagation()
      onClear()
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
          w-full flex items-center justify-between text-left transition-all group rounded
          ${currentSize.btn}
          ${currentVariant}
          ${isOpen ? 'bg-eq-bg-elevated text-eq-text-primary z-10' : ''}
        `}
      >
        <span className={`block truncate ${!selectedOption && variant !== 'ghost' ? 'text-eq-text-muted' : ''} ${showClear ? 'pr-4' : ''}`}>
          {variant === 'ghost' && <span className="text-eq-text-muted mr-1.5 font-normal opacity-70">{placeholder}:</span>}
          {displayLabel}
        </span>

        <div className="flex items-center absolute right-2 top-1/2 -translate-y-1/2">
            {showClear && (
                <span
                    onClick={handleClear}
                    className="p-0.5 rounded-full text-eq-text-muted hover:text-eq-text-primary hover:bg-white/10 mr-1 z-10"
                    title="清除"
                >
                    <X className="w-3 h-3" />
                </span>
            )}
            <ChevronDown className={`${currentSize.icon} text-eq-text-muted/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-eq-bg-surface border border-eq-border-default rounded-lg shadow-xl max-h-60 overflow-auto animate-fadeIn min-w-[160px] p-1">
          <ul className="">
            {options.length === 0 ? (
              <li className={`text-eq-text-muted text-center ${currentSize.option}`}>无选项</li>
            ) : (
              options.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      w-full flex items-center justify-between text-left transition-colors rounded-md
                      ${currentSize.option}
                      ${opt.value === value 
                          ? 'bg-eq-bg-elevated text-eq-text-primary font-medium' 
                          : 'text-eq-text-secondary hover:bg-eq-bg-elevated/50 hover:text-eq-text-primary'
                      }
                    `}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.value === value && <Check className={`${currentSize.icon} text-eq-primary-500`} />}
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
