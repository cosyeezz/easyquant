import { useState, useRef } from 'react'
import { FolderOpen, File, Files, Filter } from 'lucide-react'

const MODES = [
  { id: 'folder', label: '文件夹', icon: FolderOpen, hint: '选择整个文件夹' },
  { id: 'file', label: '单个文件', icon: File, hint: '选择单个文件' },
  { id: 'files', label: '多个文件', icon: Files, hint: '选择多个文件' },
  { id: 'pattern', label: '按后缀', icon: Filter, hint: '指定文件后缀' },
]

function FilePathPicker({ value, onChange, placeholder }) {
  const [mode, setMode] = useState('folder')
  const [pattern, setPattern] = useState('.csv')
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

  const handleModeChange = (newMode) => {
    setMode(newMode)
    onChange({ path: value?.path || '', mode: newMode, pattern: newMode === 'pattern' ? pattern : undefined })
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (mode === 'folder') {
      const firstPath = files[0]?.webkitRelativePath || files[0]?.name
      const folderPath = firstPath.split('/')[0]
      onChange({ path: folderPath, mode, files: files.map(f => f.webkitRelativePath || f.name) })
    } else {
      const paths = files.map(f => f.name)
      onChange({ path: paths.join(', '), mode, files: paths })
    }
  }

  const handlePathInput = (e) => {
    onChange({ path: e.target.value, mode, pattern: mode === 'pattern' ? pattern : undefined })
  }

  const handlePatternChange = (e) => {
    setPattern(e.target.value)
    onChange({ path: value?.path || '', mode, pattern: e.target.value })
  }

  const triggerPicker = () => {
    if (mode === 'folder') {
      folderInputRef.current?.click()
    } else {
      fileInputRef.current?.click()
    }
  }

  const currentMode = MODES.find(m => m.id === mode)
  const Icon = currentMode?.icon || FolderOpen

  return (
    <div className="space-y-3">
      {/* Mode selector */}
      <div className="flex gap-2">
        {MODES.map((m) => {
          const ModeIcon = m.icon
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleModeChange(m.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m.id
                  ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ModeIcon className="w-4 h-4" />
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Path input with browse button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={typeof value === 'string' ? value : value?.path || ''}
            onChange={handlePathInput}
            className="input-field pr-10"
            placeholder={placeholder || currentMode?.hint}
          />
          <Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
        <button
          type="button"
          onClick={triggerPicker}
          className="btn-secondary flex items-center gap-2 whitespace-nowrap"
        >
          <FolderOpen className="w-4 h-4" />
          浏览
        </button>
      </div>

      {/* Pattern input for pattern mode */}
      {mode === 'pattern' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">文件后缀：</span>
          <input
            type="text"
            value={pattern}
            onChange={handlePatternChange}
            className="input-field w-32"
            placeholder=".csv"
          />
          <span className="text-xs text-slate-400">例如: .csv, .xlsx, .json</span>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple={mode === 'files' || mode === 'pattern'}
        accept={mode === 'pattern' ? pattern : undefined}
        onChange={handleFileSelect}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        webkitdirectory=""
        onChange={handleFileSelect}
      />

      <p className="text-xs text-slate-400">{currentMode?.hint}</p>
    </div>
  )
}

export default FilePathPicker
