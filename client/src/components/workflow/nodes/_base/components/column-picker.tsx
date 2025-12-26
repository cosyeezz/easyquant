import React, { FC } from 'react'

type ColumnPickerProps = {
  value: string
  onSelect: (value: string) => void
  options: { name: string; type: string }[]
  placeholder?: string
  className?: string
}

export const ColumnPicker: FC<ColumnPickerProps> = ({ 
  value, 
  onSelect, 
  options, 
  placeholder,
  className = "" 
}) => {
  return (
    <div className={`relative ${className}`}>
      <select 
        value={value} 
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
      >
        <option value="">{placeholder || '选择字段...'}</option>
        {options.map(opt => (
          <option key={opt.name} value={opt.name}>
            {opt.name} ({opt.type})
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}
