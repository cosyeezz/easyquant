import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  RefreshCw,
  Trash2,
  Search,
  Settings,
  Info,
  Code,
  FileJson,
  Box,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Zap,
  X,
  Copy,
  Eye,
  Edit3,
  Database,
  FileText,
  Hash,
  List,
  CheckSquare,
  Columns,
  Table,
  Terminal,
  Filter,
  MoreHorizontal,
  GripVertical,
  FolderOpen,
  BarChart3,
  Send,
  FileOutput,
  Activity,
  MessageSquare,
  Braces,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react'
import Select from '@/components/ui/Select'

// === Constants ===
const AVAILABLE_ICONS = [
  { name: 'box', icon: Box, label: 'Box' },
  { name: 'zap', icon: Zap, label: 'Flash' },
  { name: 'activity', icon: Activity, label: 'Activity' },
  { name: 'database', icon: Database, label: 'Database' },
  { name: 'file-text', icon: FileText, label: 'File' },
  { name: 'filter', icon: Filter, label: 'Filter' },
  { name: 'bar-chart-3', icon: BarChart3, label: 'Chart' },
  { name: 'terminal', icon: Terminal, label: 'Terminal' },
  { name: 'shield-check', icon: ShieldCheck, label: 'Shield' },
  { name: 'clock', icon: Clock, label: 'Clock' },
  { name: 'search', icon: Search, label: 'Search' },
  { name: 'settings', icon: Settings, label: 'Settings' },
  { name: 'code', icon: Code, label: 'Code' },
  { name: 'file-json', icon: FileJson, label: 'JSON' },
  { name: 'folder-open', icon: FolderOpen, label: 'Folder' },
  { name: 'send', icon: Send, label: 'Send' },
  { name: 'message-square', icon: MessageSquare, label: 'Message' },
]

// === Sub Components ===

// Truncated text with hover tooltip and copy button
const TruncatedText = ({ text, maxWidth = '140px', className = '', as: Component = 'span' }) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const [copied, setCopied] = useState(false)
  const textRef = React.useRef(null)
  const [isTruncated, setIsTruncated] = useState(false)
  const { t } = useTranslation('translation', { keyPrefix: 'easyquant' })

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth)
    }
  }, [text])

  const handleCopy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  return (
    <div
      className="relative inline-block"
      style={{ maxWidth }}
      onMouseEnter={() => isTruncated && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Component
        ref={textRef}
        className={`block truncate ${className}`}
      >
        {text}
      </Component>

      {showTooltip && (
        <div className="absolute left-0 top-full pt-1 z-50">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#2a2a2e] text-eq-text-primary text-xs rounded-md shadow-lg border border-gray-200 dark:border-[#3a3a3e] max-w-[400px] animate-fadeIn">
            <span className="break-all leading-tight flex-1">{text}</span>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 p-1 text-eq-text-muted hover:text-eq-primary-500 hover:bg-eq-bg-elevated rounded transition-colors"
              title={t('workflow.common.copy', '复制')}
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {/* Arrow */}
          <div className="absolute top-1 left-4 -translate-y-1/2 w-2 h-2 bg-white dark:bg-[#2a2a2e] rotate-45 border-l border-t border-gray-200 dark:border-[#3a3a3e]" />
        </div>
      )}
    </div>
  )
}

const IconPicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedIconObj = AVAILABLE_ICONS.find(i => i.name === value) || AVAILABLE_ICONS[0]
  const SelectedIcon = selectedIconObj.icon

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-white dark:bg-[#1a1a1c] rounded-xl border border-eq-border-subtle shadow-sm hover:border-eq-primary-500 transition-colors"
      >
        <SelectedIcon className="w-5 h-5 text-eq-primary-500" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 p-2 bg-white dark:bg-[#1a1a1c] border border-eq-border-subtle rounded-xl shadow-xl z-20 grid grid-cols-5 gap-1">
            {AVAILABLE_ICONS.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  onChange(item.name)
                  setIsOpen(false)
                }}
                className={`p-2 rounded-lg hover:bg-eq-bg-elevated transition-colors flex items-center justify-center ${
                  value === item.name ? 'bg-eq-primary-500/10 text-eq-primary-500 ring-1 ring-eq-primary-500/30' : 'text-eq-text-secondary'
                }`}
                title={item.label}
              >
                <item.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Type-specific config forms for input parameters
const ParamTypeConfig = ({ type, config, onChange }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'easyquant' })
  const updateConfig = (key, value) => {
    onChange({ ...config, [key]: value })
  }

  const inputClass = "w-full px-2 py-1 bg-white dark:bg-[#222225] border border-eq-border-subtle rounded text-[11px] text-eq-text-primary outline-none focus:border-eq-primary-500"
  const labelClass = "text-[10px] font-semibold text-eq-text-muted uppercase tracking-wider"
  const checkboxLabelClass = "flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-[#1a1a1c] border border-eq-border-subtle rounded text-[10px] cursor-pointer hover:border-eq-primary-500 transition-colors"

  switch (type) {
    case 'file_picker':
      return (
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-eq-border-subtle">
          <div className="space-y-1.5">
            <label className={labelClass}>{t('workflow.config.allowedTypes', 'Allowed Types')}</label>
            <div className="flex flex-wrap gap-1.5">
              {['.csv', '.txt', '.xlsx', '.json', '.parquet', 'folder'].map(ext => (
                <label key={ext} className={checkboxLabelClass}>
                  <input
                    type="checkbox"
                    checked={(config.accept || []).includes(ext)}
                    onChange={(e) => {
                      const accept = config.accept || []
                      updateConfig('accept', e.target.checked
                        ? [...accept, ext]
                        : accept.filter(a => a !== ext))
                    }}
                    className="w-3 h-3 rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-eq-text-secondary">{ext}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.multiple || false}
                onChange={(e) => updateConfig('multiple', e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-[11px] text-eq-text-secondary">{t('workflow.config.allowMultiple', 'Allow multiple selection')}</span>
            </label>
            <div className="space-y-1">
              <label className={labelClass}>{t('workflow.config.defaultPath', 'Default Path')}</label>
              <input
                type="text"
                value={config.default || ''}
                onChange={(e) => updateConfig('default', e.target.value)}
                placeholder="/data/"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )

    case 'number':
      return (
        <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-eq-border-subtle">
          <div className="space-y-1">
            <label className={labelClass}>{t('workflow.config.min', 'Min')}</label>
            <input
              type="number"
              value={config.min ?? ''}
              onChange={(e) => updateConfig('min', e.target.value ? Number(e.target.value) : undefined)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>{t('workflow.config.max', 'Max')}</label>
            <input
              type="number"
              value={config.max ?? ''}
              onChange={(e) => updateConfig('max', e.target.value ? Number(e.target.value) : undefined)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>{t('workflow.config.step', 'Step')}</label>
            <input
              type="number"
              value={config.step ?? ''}
              onChange={(e) => updateConfig('step', e.target.value ? Number(e.target.value) : undefined)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>{t('workflow.config.default', 'Default')}</label>
            <input
              type="number"
              value={config.default ?? ''}
              onChange={(e) => updateConfig('default', e.target.value ? Number(e.target.value) : undefined)}
              className={inputClass}
            />
          </div>
        </div>
      )

    case 'text':
      return (
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-eq-border-subtle">
          <div className="space-y-1">
            <label className={labelClass}>{t('workflow.config.placeholder', 'Placeholder')}</label>
            <input
              type="text"
              value={config.placeholder || ''}
              onChange={(e) => updateConfig('placeholder', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>{t('workflow.config.maxLength', 'Max Length')}</label>
            <input
              type="number"
              value={config.max_length ?? ''}
              onChange={(e) => updateConfig('max_length', e.target.value ? Number(e.target.value) : undefined)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>{t('workflow.config.pattern', 'Pattern (Regex)')}</label>
            <input
              type="text"
              value={config.pattern || ''}
              onChange={(e) => updateConfig('pattern', e.target.value)}
              placeholder="^[a-z_]+$"
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>
      )

    case 'select':
    case 'multi_select':
      return (
        <div className="mt-3 pt-3 border-t border-eq-border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <label className={labelClass}>{t('workflow.config.options', 'Options')}</label>
            <button
              onClick={() => {
                const options = config.options || []
                updateConfig('options', [...options, { value: `option_${options.length + 1}`, label: `Option ${options.length + 1}` }])
              }}
              className="text-[10px] text-eq-primary-500 hover:text-eq-primary-600 font-medium"
            >
              + {t('workflow.config.addOption', 'Add Option')}
            </button>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
            {(config.options || []).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt.value}
                  onChange={(e) => {
                    const options = [...config.options]
                    options[idx] = { ...opt, value: e.target.value }
                    updateConfig('options', options)
                  }}
                  placeholder="value"
                  className={`${inputClass} flex-1 font-mono`}
                />
                <input
                  type="text"
                  value={opt.label || opt.value}
                  onChange={(e) => {
                    const options = [...config.options]
                    options[idx] = { ...opt, label: e.target.value }
                    updateConfig('options', options)
                  }}
                  placeholder="label"
                  className={`${inputClass} flex-1`}
                />
                <button
                  onClick={() => {
                    updateConfig('options', config.options.filter((_, i) => i !== idx))
                  }}
                  className="p-1 text-eq-text-muted hover:text-eq-danger-text"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )

    case 'code':
      return (
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-eq-border-subtle">
          <div className="space-y-1">
            <label className={labelClass}>{t('workflow.config.language', 'Language')}</label>
            <Select
              value={config.language || 'python'}
              onChange={(val) => updateConfig('language', val)}
              options={[{value: 'python', label: 'Python'}, {value: 'sql', label: 'SQL'}]}
              size="sm"
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>{t('workflow.config.height', 'Height')}</label>
            <input
              type="text"
              value={config.height || '200px'}
              onChange={(e) => updateConfig('height', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )

    case 'limit':
      return (
        <div className="mt-3 pt-3 border-t border-eq-border-subtle space-y-2">
          <label className={labelClass}>{t('workflow.config.availableModes', 'Available Modes')}</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: 'head_n', label: 'First N' },
              { value: 'tail_n', label: 'Last N' },
              { value: 'head_pct', label: 'First N%' },
              { value: 'tail_pct', label: 'Last N%' },
              { value: 'none', label: 'No Limit' },
            ].map(mode => (
              <label key={mode.value} className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  checked={(config.modes || ['none']).includes(mode.value)}
                  onChange={(e) => {
                    const modes = config.modes || ['none']
                    updateConfig('modes', e.target.checked
                      ? [...modes, mode.value]
                      : modes.filter(m => m !== mode.value))
                  }}
                  className="w-3 h-3 rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-eq-text-secondary">{mode.label}</span>
              </label>
            ))}
          </div>
        </div>
      )

    case 'upstream_column':
    case 'upstream_columns':
      return (
        <div className="mt-3 pt-3 border-t border-eq-border-subtle space-y-2">
          <label className={labelClass}>{t('workflow.config.allowedColumnTypes', 'Allowed Column Types')}</label>
          <div className="flex flex-wrap gap-1.5">
            {['string', 'number', 'integer', 'boolean', 'date', 'datetime'].map(colType => (
              <label key={colType} className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  checked={(config.column_types || []).includes(colType)}
                  onChange={(e) => {
                    const types = config.column_types || []
                    updateConfig('column_types', e.target.checked
                      ? [...types, colType]
                      : types.filter(t => t !== colType))
                  }}
                  className="w-3 h-3 rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-eq-text-secondary">{colType}</span>
              </label>
            ))}
          </div>
        </div>
      )

    case 'db_table':
      return (
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-eq-border-subtle">
          <div className="space-y-1">
            <label className={labelClass}>{t('workflow.config.connectionId', 'Connection ID')}</label>
            <input
              type="text"
              value={config.connection_id || ''}
              onChange={(e) => updateConfig('connection_id', e.target.value)}
              placeholder="default"
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>{t('workflow.config.tableFilter', 'Table Filter (Regex)')}</label>
            <input
              type="text"
              value={config.table_filter || ''}
              onChange={(e) => updateConfig('table_filter', e.target.value)}
              placeholder="^stock_.*"
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>
      )

    default:
      return null
  }
}

// Parameter Card Component
const ParamCard = ({ param, paramKey, index, isEditing, onEdit, onDelete, typeLabel, onDragStart, onDragOver, onDragEnd, isDragging, isDragOver }) => {
  const TypeIcon = param.icon || Box

  return (
    <div
      className={`group relative bg-eq-bg-surface border rounded-lg overflow-hidden transition-all ${
        isDragging ? 'opacity-50 border-eq-primary-500' :
        isDragOver ? 'border-eq-primary-500 border-dashed bg-eq-primary-500/5' :
        'border-eq-border-subtle hover:border-eq-border-default'
      }`}
      draggable={isEditing}
      onDragStart={(e) => {
        if (!isEditing) return
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', paramKey)
        onDragStart?.(paramKey)
      }}
      onDragOver={(e) => {
        if (!isEditing) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onDragOver?.(paramKey)
      }}
      onDragEnd={() => {
        onDragEnd?.()
      }}
      onDrop={(e) => {
        e.preventDefault()
      }}
    >
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        {isEditing && (
          <div className="flex items-center text-eq-text-muted cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3 h-3 opacity-40 hover:opacity-100 transition-opacity" />
          </div>
        )}

        <div className="p-1 rounded bg-eq-bg-elevated border border-eq-border-subtle">
          <TypeIcon className="w-3 h-3 text-eq-primary-500" />
        </div>

        <span className="text-[11px] font-medium text-eq-text-primary truncate max-w-[100px]">{param.title || paramKey}</span>
        <code className="text-[9px] text-eq-text-muted font-mono bg-eq-bg-elevated px-1 rounded flex-shrink-0">{paramKey}</code>
        <span className="text-[9px] text-eq-text-muted px-1.5 py-0.5 bg-eq-bg-elevated rounded flex-shrink-0">{typeLabel}</span>
        {param.required && (
          <span className="text-[9px] text-eq-danger-text font-medium flex-shrink-0">*</span>
        )}

        <div className="flex-1" />

        {isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1 text-eq-text-muted hover:text-eq-primary-500 hover:bg-eq-bg-elevated rounded transition-colors">
              <Edit3 className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="p-1 text-eq-text-muted hover:text-eq-danger-text hover:bg-eq-danger-bg rounded transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Output Parameter Card
const OutputParamCard = ({ param, paramKey, isEditing, onEdit, onDelete, typeLabel, onDragStart, onDragOver, onDragEnd, isDragging, isDragOver }) => {
  const TypeIcon = param.icon || Box

  return (
    <div
      className={`group relative bg-eq-bg-surface border rounded-lg overflow-hidden transition-all ${
        isDragging ? 'opacity-50 border-eq-success-border' :
        isDragOver ? 'border-eq-success-border border-dashed bg-eq-success-bg/30' :
        'border-eq-border-subtle hover:border-eq-border-default'
      }`}
      draggable={isEditing}
      onDragStart={(e) => {
        if (!isEditing) return
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', paramKey)
        onDragStart?.(paramKey)
      }}
      onDragOver={(e) => {
        if (!isEditing) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onDragOver?.(paramKey)
      }}
      onDragEnd={() => {
        onDragEnd?.()
      }}
      onDrop={(e) => {
        e.preventDefault()
      }}
    >
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        {isEditing && (
          <div className="flex items-center text-eq-text-muted cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3 h-3 opacity-40 hover:opacity-100 transition-opacity" />
          </div>
        )}

        <div className="p-1 rounded bg-eq-success-bg border border-eq-success-border">
          <TypeIcon className="w-3 h-3 text-eq-success-text" />
        </div>

        <span className="text-[11px] font-medium text-eq-text-primary truncate max-w-[100px]">{param.title || paramKey}</span>
        <code className="text-[9px] text-eq-text-muted font-mono bg-eq-bg-elevated px-1 rounded flex-shrink-0">{paramKey}</code>
        <span className="text-[9px] text-eq-text-muted px-1.5 py-0.5 bg-eq-bg-elevated rounded flex-shrink-0">{typeLabel}</span>

        <div className="flex-1" />

        {isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1 text-eq-text-muted hover:text-eq-primary-500 hover:bg-eq-bg-elevated rounded transition-colors">
              <Edit3 className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="p-1 text-eq-text-muted hover:text-eq-danger-text hover:bg-eq-danger-bg rounded transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Add Parameter Modal
const AddParamModal = ({ isOpen, onClose, onAdd, onUpdate, paramTypes, title, editData, existingKeys = [] }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'easyquant' })
  const isEditMode = !!editData

  // State for modal
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState(null)
  const [paramData, setParamData] = useState({ name: '', title: '', description: '', required: true, config: {} })

  // Reset state when modal opens or editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        const typeInfo = paramTypes.find(t => t.type === editData.data.type)
        const { type, title, description, _stableId, ...config } = editData.data
        setStep(2)
        setSelectedType(typeInfo || null)
        setParamData({
          name: editData.key,
          title: title || editData.key,
          description: description || '',
          required: editData.required || false,
          config
        })
      } else {
        // Reset to initial state for new parameter
        setStep(1)
        setSelectedType(null)
        setParamData({ name: '', title: '', description: '', required: true, config: {} })
      }
    }
  }, [isOpen, editData, paramTypes])

  // Generate unique name based on existing keys
  const generateUniqueName = (baseName) => {
    if (!existingKeys.includes(baseName)) {
      return baseName
    }
    let counter = 1
    while (existingKeys.includes(`${baseName}_${counter}`)) {
      counter++
    }
    return `${baseName}_${counter}`
  }

  const getTypeDefaults = (type) => {
    const title = t(`workflow.paramDefaults.${type}.title`, type)
    const description = t(`workflow.paramDefaults.${type}.desc`, 'No description')

    // Default variable names map
    const nameMap = {
      'file_picker': 'file_path',
      'number': 'value',
      'text': 'text',
      'select': 'option',
      'multi_select': 'options',
      'upstream_column': 'column',
      'upstream_columns': 'columns',
      'db_table': 'table_name',
      'code': 'code',
      'limit': 'limit',
      'df': 'df',
      'signal': 'signal',
      'file': 'file_path',
      'chart': 'chart_config',
      'metrics': 'metrics',
      'message': 'msg',
      'json': 'data',
      'status': 'status',
    }

    const baseName = nameMap[type] || 'variable'
    const uniqueName = generateUniqueName(baseName)

    return {
        name: uniqueName,
        title,
        description
    }
  }

  const handleSubmit = () => {
    if (!paramData.name) return
    // In edit mode, use the original type if selectedType is not available
    const typeValue = selectedType?.type || editData?.data?.type
    if (!typeValue) return

    const submitData = {
      ...paramData,
      type: typeValue,
      originalKey: editData?.key // Pass original key for updates
    }
    if (isEditMode && onUpdate) {
      onUpdate(submitData)
    } else {
      onAdd(submitData)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fadeIn">
      <div className="bg-white dark:bg-[#1a1a1c] border border-eq-border-subtle rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-eq-border-subtle">
          <h3 className="text-sm font-semibold text-eq-text-primary">{title}</h3>
          <button onClick={onClose} className="p-1 text-eq-text-muted hover:text-eq-text-primary rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {step === 1 ? (
            <div className="space-y-3">
              <p className="text-xs text-eq-text-secondary mb-4">{t('workflow.nodeList.selectType', 'Select parameter type:')}</p>
              <div className="grid grid-cols-2 gap-2">
                {paramTypes.map(type => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.type}
                      onClick={() => {
                        setSelectedType(type)
                        setStep(2)
                        const defaults = getTypeDefaults(type.type)
                        setParamData(prev => ({ ...prev, ...defaults }))
                      }}
                      className="flex items-start gap-3 p-3 bg-eq-bg-elevated/50 border border-eq-border-subtle rounded-lg hover:border-eq-primary-500 hover:bg-eq-bg-elevated transition-all text-left group"
                    >
                      <div className="p-1.5 rounded-md bg-eq-bg-surface border border-eq-border-subtle group-hover:border-eq-primary-500 transition-colors">
                        <Icon className="w-4 h-4 text-eq-text-secondary group-hover:text-eq-primary-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-eq-text-primary">{type.label}</div>
                        <div className="text-[10px] text-eq-text-muted mt-0.5">{type.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-eq-border-subtle">
                <div className="p-2 rounded-lg bg-eq-bg-elevated border border-eq-border-subtle">
                  {selectedType ? <selectedType.icon className="w-5 h-5 text-eq-primary-500" /> : <Box className="w-5 h-5 text-eq-primary-500" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-eq-text-primary">{selectedType?.label || editData?.data?.type || 'Unknown'}</div>
                  <div className="text-[11px] text-eq-text-muted">{selectedType?.description || ''}</div>
                </div>
                {!isEditMode && (
                  <button
                    onClick={() => setStep(1)}
                    className="ml-auto text-[11px] text-eq-primary-500 hover:text-eq-primary-600"
                  >
                    {t('workflow.nodeList.changeType', 'Change Type')}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-eq-text-muted uppercase tracking-wider">
                    {t('workflow.nodeList.parameterId', 'Parameter ID')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paramData.name}
                    onChange={(e) => setParamData({ ...paramData, name: e.target.value })}
                    placeholder="e.g., file_path"
                    className="w-full px-2.5 py-1.5 bg-eq-bg-elevated border border-eq-border-subtle rounded text-xs text-eq-text-primary outline-none focus:border-eq-primary-500 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-eq-text-muted uppercase tracking-wider">
                    {t('workflow.nodeList.displayTitle', 'Display Title')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paramData.title}
                    onChange={(e) => setParamData({ ...paramData, title: e.target.value })}
                    placeholder="e.g., File Path"
                    className="w-full px-2.5 py-1.5 bg-eq-bg-elevated border border-eq-border-subtle rounded text-xs text-eq-text-primary outline-none focus:border-eq-primary-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-eq-text-muted uppercase tracking-wider">{t('workflow.nodeList.description', 'Description')}</label>
                <input
                  type="text"
                  value={paramData.description}
                  onChange={(e) => setParamData({ ...paramData, description: e.target.value })}
                  placeholder={t('workflow.nodeList.descriptionPlaceholder', 'Brief description...')}
                  className="w-full px-2.5 py-1.5 bg-eq-bg-elevated border border-eq-border-subtle rounded text-xs text-eq-text-primary outline-none focus:border-eq-primary-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paramData.required}
                  onChange={(e) => setParamData({ ...paramData, required: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-xs text-eq-text-secondary">{t('workflow.nodeList.required', 'Required parameter')}</span>
              </label>

              {/* Type-specific config */}
              <ParamTypeConfig
                type={selectedType?.type}
                config={paramData.config}
                onChange={(config) => setParamData({ ...paramData, config })}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-eq-border-subtle bg-eq-bg-elevated/30">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-eq-text-secondary hover:text-eq-text-primary rounded transition-colors"
          >
            {t('workflow.nodeList.cancel', 'Cancel')}
          </button>
          {step === 2 && (
            <button
              onClick={handleSubmit}
              disabled={!paramData.name || !paramData.title}
              className="px-4 py-1.5 text-xs font-medium text-white bg-eq-primary-500 hover:bg-eq-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditMode ? t('workflow.nodeList.updateParameter', 'Update Parameter') : t('workflow.nodeList.addParameter', 'Add Parameter')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// === Main Component ===
const WorkflowNodeList = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'easyquant' })
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedNode, setSelectedNode] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [showAddInputModal, setShowAddInputModal] = useState(false)
  const [showAddOutputModal, setShowAddOutputModal] = useState(false)
  const [editingInputParam, setEditingInputParam] = useState(null) // { key, data }
  const [editingOutputParam, setEditingOutputParam] = useState(null) // { key, data }
  const [deleteModal, setDeleteModal] = useState({ open: false, nodeId: null })

  // Drag-and-drop state
  const [draggingInputKey, setDraggingInputKey] = useState(null)
  const [dragOverInputKey, setDragOverInputKey] = useState(null)
  const [draggingOutputKey, setDraggingOutputKey] = useState(null)
  const [dragOverOutputKey, setDragOverOutputKey] = useState(null)

  // Memoized Constants for Translation
  const CATEGORIES = useMemo(() => [
    { value: 'all', label: t('workflow.nodeList.allCategories'), icon: null },
    { value: 'input', label: t('workflow.nodeList.categoryInput'), icon: Box, folder: 'server.nodes.input' },
    { value: 'transform', label: t('workflow.nodeList.categoryTransform'), icon: Zap, folder: 'server.nodes.transform' },
    { value: 'quant', label: t('workflow.nodeList.categoryQuant'), icon: BarChart3, folder: 'server.nodes.quant' },
    { value: 'strategy', label: t('workflow.nodeList.categoryStrategy'), icon: Activity, folder: 'server.nodes.strategy' },
    { value: 'backtest', label: t('workflow.nodeList.categoryBacktest'), icon: Clock, folder: 'server.nodes.backtest' },
    { value: 'output', label: t('workflow.nodeList.categoryOutput'), icon: ShieldCheck, folder: 'server.nodes.output' },
  ], [t])

  const STATUSES = useMemo(() => [
    { value: 'all', label: t('workflow.nodeList.allStatus'), color: null },
    { value: 'active', label: t('workflow.nodeList.statusActive'), color: 'text-eq-success-text' },
    { value: 'draft', label: t('workflow.nodeList.statusDraft'), color: 'text-eq-warning-text' },
  ], [t])

  const INPUT_PARAM_TYPES = useMemo(() => [
    { type: 'file_picker', label: t('workflow.paramDefaults.file_picker.title'), icon: FolderOpen, description: t('workflow.paramDefaults.file_picker.desc') },
    { type: 'number', label: t('workflow.paramDefaults.number.title'), icon: Hash, description: t('workflow.paramDefaults.number.desc') },
    { type: 'text', label: t('workflow.paramDefaults.text.title'), icon: FileText, description: t('workflow.paramDefaults.text.desc') },
    { type: 'select', label: t('workflow.paramDefaults.select.title'), icon: List, description: t('workflow.paramDefaults.select.desc') },
    { type: 'multi_select', label: t('workflow.paramDefaults.multi_select.title'), icon: CheckSquare, description: t('workflow.paramDefaults.multi_select.desc') },
    { type: 'upstream_column', label: t('workflow.paramDefaults.upstream_column.title'), icon: Columns, description: t('workflow.paramDefaults.upstream_column.desc') },
    { type: 'upstream_columns', label: t('workflow.paramDefaults.upstream_columns.title'), icon: Columns, description: t('workflow.paramDefaults.upstream_columns.desc') },
    { type: 'db_table', label: t('workflow.paramDefaults.db_table.title'), icon: Table, description: t('workflow.paramDefaults.db_table.desc') },
    { type: 'code', label: t('workflow.paramDefaults.code.title'), icon: Terminal, description: t('workflow.paramDefaults.code.desc') },
    { type: 'limit', label: t('workflow.paramDefaults.limit.title'), icon: Filter, description: t('workflow.paramDefaults.limit.desc') },
  ], [t])

  const OUTPUT_PARAM_TYPES = useMemo(() => [
    { type: 'df', label: t('workflow.paramDefaults.df.title'), icon: Table, description: t('workflow.paramDefaults.df.desc') },
    { type: 'signal', label: t('workflow.paramDefaults.signal.title'), icon: Activity, description: t('workflow.paramDefaults.signal.desc') },
    { type: 'file', label: t('workflow.paramDefaults.file.title'), icon: FileOutput, description: t('workflow.paramDefaults.file.desc') },
    { type: 'chart', label: t('workflow.paramDefaults.chart.title'), icon: BarChart3, description: t('workflow.paramDefaults.chart.desc') },
    { type: 'metrics', label: t('workflow.paramDefaults.metrics.title'), icon: Hash, description: t('workflow.paramDefaults.metrics.desc') },
    { type: 'message', label: t('workflow.paramDefaults.message.title'), icon: MessageSquare, description: t('workflow.paramDefaults.message.desc') },
    { type: 'json', label: t('workflow.paramDefaults.json.title'), icon: Braces, description: t('workflow.paramDefaults.json.desc') },
    { type: 'status', label: t('workflow.paramDefaults.status.title'), icon: CheckCircle2, description: t('workflow.paramDefaults.status.desc') },
  ], [t])

  const fetchNodes = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/api/v1/workflow/nodes')
      const data = await response.json()
      setNodes(data)
    } catch (error) {
      console.error('Failed to fetch nodes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    const newNode = {
      name: `custom_node_${Date.now()}`,
      title: t('workflow.nodeList.newNode', 'New Custom Node'),
      category: 'transform',
      type: 'generic',
      icon: 'box',
      description: '',
      status: 'draft',
      parameters_schema: {
        type: 'object',
        properties: {},
        required: []
      },
      outputs_schema: {},
      ui_config: {
        width: 240,
        handles: {
          source: ['input'],
          target: ['output']
        }
      },
      handler_path: 'server.nodes.custom.MyHandler',
      is_active: false
    }
    setSelectedNode(newNode)
    setEditForm(newNode)
    setIsEditing(true)
  }

  const startEditing = () => {
    setEditForm({ ...selectedNode })
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      const isNew = !selectedNode.id
      const url = isNew
        ? 'http://localhost:8000/api/v1/workflow/nodes'
        : `http://localhost:8000/api/v1/workflow/nodes/${selectedNode.id}`

      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        setIsEditing(false)
        await fetchNodes()
        const data = await response.json()
        setSelectedNode(isNew ? data : { ...editForm })
      }
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  const handleDelete = async (id) => {
    try {
      await fetch(`http://localhost:8000/api/v1/workflow/nodes/${id}`, { method: 'DELETE' })
      await fetchNodes()
      if (selectedNode?.id === id) setSelectedNode(null)
      setDeleteModal({ open: false, nodeId: null })
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  const handleAddInputParam = (paramData) => {
    const newProps = {
      ...editForm.parameters_schema.properties,
      [paramData.name]: {
        type: paramData.type,
        title: paramData.title,
        description: paramData.description,
        ...paramData.config,
        _stableId: `_id_${Date.now()}`
      }
    }
    const required = paramData.required
      ? [...(editForm.parameters_schema.required || []), paramData.name]
      : editForm.parameters_schema.required || []

    setEditForm({
      ...editForm,
      parameters_schema: {
        ...editForm.parameters_schema,
        properties: newProps,
        required
      }
    })
  }

  const handleAddOutputParam = (paramData) => {
    setEditForm({
      ...editForm,
      outputs_schema: {
        ...editForm.outputs_schema,
        [paramData.name]: {
          type: paramData.type,
          title: paramData.title,
          description: paramData.description
        }
      }
    })
  }

  const handleUpdateInputParam = (paramData) => {
    const { originalKey, name, type, title, description, required, config } = paramData
    const newProps = { ...editForm.parameters_schema.properties }

    // Remove old key if name changed
    if (originalKey && originalKey !== name) {
      delete newProps[originalKey]
    }

    // Add/update with new key
    newProps[name] = {
      type,
      title,
      description,
      ...config,
      _stableId: editForm.parameters_schema.properties[originalKey]?._stableId || `_id_${Date.now()}`
    }

    // Update required array
    let requiredArr = (editForm.parameters_schema.required || []).filter(k => k !== originalKey)
    if (required) {
      requiredArr = [...requiredArr, name]
    }

    setEditForm({
      ...editForm,
      parameters_schema: {
        ...editForm.parameters_schema,
        properties: newProps,
        required: requiredArr
      }
    })
    setEditingInputParam(null)
  }

  const handleUpdateOutputParam = (paramData) => {
    const { originalKey, name, type, title, description } = paramData
    const newOutputs = { ...editForm.outputs_schema }

    // Remove old key if name changed
    if (originalKey && originalKey !== name) {
      delete newOutputs[originalKey]
    }

    // Add/update with new key
    newOutputs[name] = { type, title, description }

    setEditForm({ ...editForm, outputs_schema: newOutputs })
    setEditingOutputParam(null)
  }

  // Handle input parameter drag end - reorder on drop
  const handleInputDragEnd = () => {
    if (draggingInputKey && dragOverInputKey && draggingInputKey !== dragOverInputKey) {
      const entries = Object.entries(editForm.parameters_schema?.properties || {})
      const dragIndex = entries.findIndex(([k]) => k === draggingInputKey)
      const dropIndex = entries.findIndex(([k]) => k === dragOverInputKey)

      if (dragIndex !== -1 && dropIndex !== -1) {
        const newEntries = [...entries]
        const [removed] = newEntries.splice(dragIndex, 1)
        newEntries.splice(dropIndex, 0, removed)

        const newProps = Object.fromEntries(newEntries)
        setEditForm({
          ...editForm,
          parameters_schema: {
            ...editForm.parameters_schema,
            properties: newProps
          }
        })
      }
    }
    setDraggingInputKey(null)
    setDragOverInputKey(null)
  }

  // Handle output parameter drag end - reorder on drop
  const handleOutputDragEnd = () => {
    if (draggingOutputKey && dragOverOutputKey && draggingOutputKey !== dragOverOutputKey) {
      const entries = Object.entries(editForm.outputs_schema || {})
      const dragIndex = entries.findIndex(([k]) => k === draggingOutputKey)
      const dropIndex = entries.findIndex(([k]) => k === dragOverOutputKey)

      if (dragIndex !== -1 && dropIndex !== -1) {
        const newEntries = [...entries]
        const [removed] = newEntries.splice(dragIndex, 1)
        newEntries.splice(dropIndex, 0, removed)

        const newOutputs = Object.fromEntries(newEntries)
        setEditForm({ ...editForm, outputs_schema: newOutputs })
      }
    }
    setDraggingOutputKey(null)
    setDragOverOutputKey(null)
  }

  useEffect(() => {
    fetchNodes()
  }, [])

  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const matchesSearch = node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || node.category === categoryFilter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && node.is_active) ||
        (statusFilter === 'draft' && !node.is_active)
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [nodes, searchTerm, categoryFilter, statusFilter])

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1 py-3 border-b border-eq-border-subtle/50 flex-shrink-0">
        {/* Left: Search & Filters */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-eq-bg-surface border border-eq-border-subtle hover:border-eq-border-default transition-colors">
            <Search className="w-3.5 h-3.5 text-eq-text-muted group-hover:text-eq-text-secondary" />
            <input
              type="text"
              placeholder={t('workflow.nodeList.searchPlaceholder', 'Search nodes...')}
              className="bg-transparent border-none p-0 text-xs w-36 focus:w-48 transition-all duration-300 text-eq-text-primary placeholder:text-eq-text-muted focus:ring-0 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="p-0.5 text-eq-text-muted hover:text-eq-text-primary">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="w-px h-5 bg-eq-border-subtle" />

          {/* Category Filter */}
          <div className="w-36">
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={CATEGORIES}
              size="sm"
            />
          </div>

          {/* Status Filter */}
          <div className="w-32">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUSES}
              size="sm"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-eq-text-muted font-mono tracking-wider">
            {filteredNodes.length} / {nodes.length} NODES
          </span>
          <div className="w-px h-4 bg-eq-border-subtle" />

          <button
            onClick={handleAddNew}
            className="btn-primary !py-1.5 !px-3.5 !text-[11px] font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('workflow.nodeList.newNode', 'New Node')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-12 gap-4 pt-4 min-h-0 overflow-hidden">
        {/* Left: Node List */}
        <div className="col-span-4 flex flex-col min-h-0 bg-eq-bg-surface border border-eq-border-subtle rounded-xl overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-5 h-5 text-eq-text-muted animate-spin" />
              </div>
            ) : filteredNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-eq-text-muted p-8">
                <Box className="w-10 h-10 opacity-20 mb-3" />
                <p className="text-sm font-medium">{t('workflow.nodeList.noNodesFound', 'No nodes found')}</p>
                <p className="text-xs mt-1">{t('workflow.nodeList.tryAdjustFilters', 'Try adjusting your filters')}</p>
              </div>
            ) : (
              <div className="divide-y divide-eq-border-subtle">
                {filteredNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => {
                      setSelectedNode(node)
                      setIsEditing(false)
                    }}
                    className={`w-full flex items-center gap-3 p-3.5 transition-all text-left group
                      ${selectedNode?.id === node.id
                        ? 'bg-eq-bg-elevated border-l-2 border-l-eq-primary-500'
                        : 'hover:bg-eq-bg-elevated/50 border-l-2 border-l-transparent'}`}
                  >
                    <div className={`p-2 rounded-lg border ${
                      selectedNode?.id === node.id
                        ? 'bg-eq-bg-surface border-eq-primary-500/30'
                        : 'bg-eq-bg-elevated border-eq-border-subtle'
                    }`}>
                      {(() => {
                        const iconName = node.icon || 'box'
                        const iconObj = AVAILABLE_ICONS.find(i => i.name === iconName) || AVAILABLE_ICONS[0]
                        const Icon = iconObj.icon
                        return <Icon className={`w-4 h-4 ${selectedNode?.id === node.id ? 'text-eq-primary-500' : 'text-eq-text-muted'}`} />
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <TruncatedText
                          text={node.title}
                          maxWidth="140px"
                          className={`text-xs font-medium ${
                            selectedNode?.id === node.id ? 'text-eq-text-primary' : 'text-eq-text-secondary'
                          }`}
                        />
                        {node.is_active ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-eq-success-bg text-eq-success-text border border-eq-success-border flex-shrink-0">
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-eq-warning-bg text-eq-warning-text border border-eq-warning-border flex-shrink-0">
                            Draft
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-eq-text-muted line-clamp-2 leading-relaxed">
                        {node.description || node.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail View */}
        <div className="col-span-8 flex flex-col min-h-0 bg-eq-bg-surface border border-eq-border-subtle rounded-xl overflow-hidden">
          {selectedNode ? (
            <div className="flex flex-col h-full relative">
              {/* Header */}
              <div className="px-6 py-5 border-b border-eq-border-subtle bg-gradient-to-r from-eq-bg-elevated/50 to-transparent flex-shrink-0 relative">
                {/* Fixed Action Buttons */}
                <div className="absolute top-5 right-6 z-10 flex items-center gap-2 bg-eq-bg-surface/50 backdrop-blur-sm p-1 rounded-lg">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-3.5 py-1.5 bg-eq-bg-elevated border border-eq-border-subtle text-eq-text-primary rounded-lg text-xs font-medium hover:bg-eq-bg-overlay transition-colors shadow-sm"
                        >
                          {t('workflow.nodeList.cancel', 'Cancel')}
                        </button>
                        <button
                          onClick={handleSave}
                          className="btn-primary !py-1.5 !px-4 !text-xs shadow-sm"
                        >
                          {t('workflow.nodeList.saveChanges', 'Save Changes')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            const copied = { ...selectedNode, id: undefined, name: `${selectedNode.name}_copy`, title: `${selectedNode.title} (Copy)` }
                            setSelectedNode(copied)
                            setEditForm(copied)
                            setIsEditing(true)
                          }}
                          className="p-2 text-eq-text-secondary hover:text-eq-primary-500 hover:bg-eq-bg-elevated rounded-lg transition-colors border border-transparent hover:border-eq-border-subtle"
                          title={t('workflow.nodeList.duplicateNode', 'Duplicate Node')}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={startEditing}
                          className="p-2 text-eq-text-secondary hover:text-eq-primary-500 hover:bg-eq-bg-elevated rounded-lg transition-colors border border-transparent hover:border-eq-border-subtle"
                          title={t('workflow.nodeList.editNode', 'Edit Node')}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {selectedNode.id && (
                          <button
                            onClick={() => setDeleteModal({ open: true, nodeId: selectedNode.id })}
                            className="p-2 text-eq-text-secondary hover:text-eq-danger-text hover:bg-eq-danger-bg rounded-lg transition-colors border border-transparent hover:border-eq-danger-border"
                            title={t('workflow.nodeList.deleteNode', 'Delete Node')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                </div>

                <div className="flex items-start gap-5 pr-32"> {/* Added pr-32 to avoid overlap with fixed buttons */}
                  {isEditing ? (
                    <IconPicker 
                      value={editForm.icon || 'box'} 
                      onChange={(icon) => setEditForm({ ...editForm, icon })} 
                    />
                  ) : (
                    <div className="p-3 bg-eq-bg-surface rounded-xl border border-eq-border-subtle shadow-sm">
                      {(() => {
                        const iconName = selectedNode.icon || 'box'
                        const iconObj = AVAILABLE_ICONS.find(i => i.name === iconName) || AVAILABLE_ICONS[0]
                        const Icon = iconObj.icon
                        return <Icon className="w-5 h-5 text-eq-primary-500" />
                      })()}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="text-lg font-semibold text-eq-text-primary bg-transparent border-b border-eq-border-subtle focus:border-eq-primary-500 outline-none w-full pb-1"
                          placeholder={t('workflow.nodeList.nodeTitle', 'Node Title')}
                        />
                        <div className="flex items-center gap-2">
                           {/* Enhanced Category Select */}
                           <div className="w-40">
                              <Select
                                value={editForm.category}
                                onChange={(val) => setEditForm({ ...editForm, category: val })}
                                options={CATEGORIES.filter(c => c.value !== 'all')}
                                size="sm"
                              />
                           </div>

                           {/* Handler Path Input */}
                           <div className="flex-1 flex items-center gap-0 bg-eq-bg-elevated rounded border border-eq-border-subtle px-2 py-1 focus-within:border-eq-primary-500 transition-colors">
                              <span className="text-[10px] text-eq-text-muted select-none flex-shrink-0 mr-1">
                                {CATEGORIES.find(c => c.value === editForm.category)?.folder || 'server.nodes'}.
                              </span>
                              <input 
                                type="text"
                                value={(editForm.handler_path || '').split('.').pop()} // Only show class name
                                onChange={(e) => {
                                   const folder = CATEGORIES.find(c => c.value === editForm.category)?.folder || 'server.nodes'
                                   setEditForm({ ...editForm, handler_path: `${folder}.${e.target.value}` })
                                }}
                                className="bg-transparent border-none outline-none text-[10px] font-mono text-eq-text-primary w-full placeholder:text-eq-text-muted/50"
                                placeholder="MyHandler"
                              />
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <TruncatedText
                          text={selectedNode.title}
                          maxWidth="300px"
                          as="h3"
                          className="text-lg font-semibold text-eq-text-primary tracking-tight"
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-eq-bg-elevated border border-eq-border-subtle text-eq-text-secondary">
                            {selectedNode.category}
                          </span>
                          <code className="text-[10px] text-eq-text-muted font-mono bg-eq-bg-elevated px-1.5 py-0.5 rounded border border-eq-border-subtle">
                            {selectedNode.handler_path || selectedNode.name}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {isEditing ? (
                  <div className="mt-4 relative">
                     <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full p-3 bg-eq-bg-surface border border-eq-border-subtle rounded-lg text-sm text-eq-text-primary outline-none focus:border-eq-primary-500 resize-none transition-colors"
                      rows={2}
                      placeholder={t('workflow.nodeList.descriptionPlaceholder', 'Enter node description...')}
                    />
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-eq-bg-elevated/20 rounded-lg border border-eq-border-subtle/50">
                    <p className="text-sm text-eq-text-secondary leading-relaxed">
                      {selectedNode.description || t('workflow.nodeList.noDescription', 'No description available')}
                    </p>
                  </div>
                )}
              </div>

              {/* Content Scrollable Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 space-y-6">
                  {/* Input Parameters Section */}
                  <section>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-eq-border-subtle">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">{t('workflow.nodeList.inputParameters', 'Input Parameters')}</span>
                        <span className="text-[10px] text-eq-text-muted font-mono bg-eq-bg-elevated px-1.5 py-0.5 rounded">
                          {Object.keys(isEditing ? editForm.parameters_schema?.properties || {} : selectedNode.parameters_schema?.properties || {}).length}
                        </span>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => setShowAddInputModal(true)}
                          className="flex items-center gap-1 px-2 py-1 text-eq-primary-500 text-[10px] font-medium hover:bg-eq-primary-500/10 rounded transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          {t('workflow.nodeList.add', 'Add')}
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {Object.entries((isEditing ? editForm : selectedNode).parameters_schema?.properties || {}).map(([key, prop], idx, arr) => {
                         const typeInfo = INPUT_PARAM_TYPES.find(t => t.type === prop.type) || { icon: Box, label: prop.type }
                         const isRequired = (editForm.parameters_schema?.required || []).includes(key)
                         return (
                            <ParamCard
                              key={prop._stableId || key}
                              param={{...prop, icon: typeInfo.icon, required: isRequired}}
                              paramKey={key}
                              index={idx}
                              isEditing={isEditing}
                              typeLabel={typeInfo.label}
                              onEdit={() => setEditingInputParam({ key, data: prop, required: isRequired })}
                              onDelete={() => {
                                const updatedProps = { ...editForm.parameters_schema.properties }
                                delete updatedProps[key]
                                setEditForm({
                                  ...editForm,
                                  parameters_schema: {
                                    ...editForm.parameters_schema,
                                    properties: updatedProps,
                                    required: (editForm.parameters_schema.required || []).filter(k => k !== key)
                                  }
                                })
                              }}
                              onDragStart={setDraggingInputKey}
                              onDragOver={setDragOverInputKey}
                              onDragEnd={handleInputDragEnd}
                              isDragging={draggingInputKey === key}
                              isDragOver={dragOverInputKey === key && draggingInputKey !== key}
                            />
                         )
                      })}
                      {Object.keys((isEditing ? editForm : selectedNode).parameters_schema?.properties || {}).length === 0 && (
                        <div className="flex items-center justify-center py-4 text-eq-text-muted text-[11px]">
                          {t('workflow.nodeList.noInputs', 'No input parameters')}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Output Parameters Section */}
                  <section>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-eq-border-subtle">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">{t('workflow.nodeList.outputParameters', 'Output Parameters')}</span>
                        <span className="text-[10px] text-eq-text-muted font-mono bg-eq-bg-elevated px-1.5 py-0.5 rounded">
                          {Object.keys(isEditing ? editForm.outputs_schema || {} : selectedNode.outputs_schema || {}).length}
                        </span>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => setShowAddOutputModal(true)}
                          className="flex items-center gap-1 px-2 py-1 text-eq-success-text text-[10px] font-medium hover:bg-eq-success-bg rounded transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          {t('workflow.nodeList.add', 'Add')}
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {Object.entries((isEditing ? editForm : selectedNode).outputs_schema || {}).map(([key, prop], idx, arr) => {
                         const typeInfo = OUTPUT_PARAM_TYPES.find(t => t.type === prop.type) || { icon: Box, label: prop.type }
                         return (
                            <OutputParamCard
                              key={key}
                              param={{...prop, icon: typeInfo.icon}}
                              paramKey={key}
                              isEditing={isEditing}
                              typeLabel={typeInfo.label}
                              onEdit={() => setEditingOutputParam({ key, data: prop })}
                              onDelete={() => {
                                const updated = { ...editForm.outputs_schema }
                                delete updated[key]
                                setEditForm({ ...editForm, outputs_schema: updated })
                              }}
                              onDragStart={setDraggingOutputKey}
                              onDragOver={setDragOverOutputKey}
                              onDragEnd={handleOutputDragEnd}
                              isDragging={draggingOutputKey === key}
                              isDragOver={dragOverOutputKey === key && draggingOutputKey !== key}
                            />
                         )
                      })}
                      {Object.keys((isEditing ? editForm : selectedNode).outputs_schema || {}).length === 0 && (
                        <div className="flex items-center justify-center py-4 text-eq-text-muted text-[11px]">
                          {t('workflow.nodeList.noOutputs', 'No output parameters')}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Raw JSON (collapsed) */}
                  <section>
                    <details className="group">
                      <summary className="flex items-center gap-2 cursor-pointer text-eq-text-muted hover:text-eq-text-primary transition-colors">
                        <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                        <FileJson className="w-4 h-4" />
                        <span className="text-xs font-medium">{t('workflow.nodeList.viewRawJson', 'View Raw JSON')}</span>
                      </summary>
                      <div className="mt-3 bg-eq-bg-base rounded-lg border border-eq-border-subtle p-4 font-mono text-[11px] overflow-x-auto text-eq-text-secondary">
                        <pre>{JSON.stringify(selectedNode, null, 2)}</pre>
                      </div>
                    </details>
                  </section>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-eq-text-muted">
              <div className="p-4 bg-eq-bg-elevated rounded-2xl mb-4">
                <Info className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-sm font-medium">{t('workflow.nodeList.selectNodeTip', 'Select a node to view details')}</p>
              <p className="text-xs mt-1 text-eq-text-secondary">{t('workflow.nodeList.orCreateNew', 'Or create a new custom node')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddParamModal
        isOpen={showAddInputModal}
        onClose={() => setShowAddInputModal(false)}
        onAdd={handleAddInputParam}
        paramTypes={INPUT_PARAM_TYPES}
        title={t('workflow.nodeList.addInputParameter', 'Add Input Parameter')}
        existingKeys={Object.keys(editForm.parameters_schema?.properties || {})}
      />
      <AddParamModal
        isOpen={showAddOutputModal}
        onClose={() => setShowAddOutputModal(false)}
        onAdd={handleAddOutputParam}
        paramTypes={OUTPUT_PARAM_TYPES}
        title={t('workflow.nodeList.addOutputParameter', 'Add Output Parameter')}
        existingKeys={Object.keys(editForm.outputs_schema || {})}
      />
      {/* Edit Input Param Modal */}
      {editingInputParam && (
        <AddParamModal
          key={`edit-input-${editingInputParam.key}`}
          isOpen={true}
          onClose={() => setEditingInputParam(null)}
          onAdd={handleAddInputParam}
          onUpdate={handleUpdateInputParam}
          paramTypes={INPUT_PARAM_TYPES}
          title={t('workflow.nodeList.editInputParameter', 'Edit Input Parameter')}
          editData={editingInputParam}
        />
      )}
      {/* Edit Output Param Modal */}
      {editingOutputParam && (
        <AddParamModal
          key={`edit-output-${editingOutputParam.key}`}
          isOpen={true}
          onClose={() => setEditingOutputParam(null)}
          onAdd={handleAddOutputParam}
          onUpdate={handleUpdateOutputParam}
          paramTypes={OUTPUT_PARAM_TYPES}
          title={t('workflow.nodeList.editOutputParameter', 'Edit Output Parameter')}
          editData={editingOutputParam}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-white dark:bg-[#1a1a1c] rounded-xl p-6 max-w-md w-full border border-gray-200 dark:border-[#2a2a2e] shadow-2xl animate-slideUp">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-red-50 dark:bg-red-500/10 rounded-full flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 leading-tight">
                  {t('workflow.nodeList.deleteNode', 'Delete Node')}
                </h3>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t('workflow.nodeList.deleteConfirm', 'Are you sure you want to delete this node?')} "<TruncatedText text={selectedNode?.title || ''} maxWidth="200px" className="font-semibold text-gray-900 dark:text-gray-100 align-bottom" />" ?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-[#2a2a2e]">
              <button
                onClick={() => setDeleteModal({ open: false, nodeId: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#2a2a2e] border border-gray-300 dark:border-[#3a3a3e] rounded-lg hover:bg-gray-50 dark:hover:bg-[#333] transition-colors"
              >
                {t('workflow.nodeList.cancel', 'Cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteModal.nodeId)}
                className="flex items-center gap-2 text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-all shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                {t('workflow.nodeList.deleteNode', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkflowNodeList