import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Save, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Eye } from 'lucide-react'
import api from '../services/api'
import FilePathPicker from './FilePathPicker'

function ETLTaskEditor({ taskId, onNavigate }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(!!taskId)
  const [saving, setSaving] = useState(false)
  const [handlers, setHandlers] = useState([])
  const [columns, setColumns] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [dataTables, setDataTables] = useState([])

  const [form, setForm] = useState({
    name: '',
    description: '',
    source_type: 'csv_dir',
    source_config: { path: '' },
    batch_size: 1000,
    workers: 1,
    pipeline_config: [],
  })

  useEffect(() => {
    api.getHandlers().then(setHandlers).catch(console.error)
    api.getDataTables().then(setDataTables).catch(console.error)
    if (taskId) {
      api.getETLConfig(taskId).then(data => {
        setForm(data)
        setLoading(false)
      }).catch(console.error)
    }
  }, [taskId])

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handlePreview = async () => {
    if (!form.source_config.path) return
    setPreviewLoading(true)
    try {
      const data = await api.previewSource(form.source_type, form.source_config)
      setColumns(data.columns || [])
    } catch (error) {
      console.error('Preview failed:', error)
    } finally {
      setPreviewLoading(false)
    }
  }

  const addHandler = (handlerName) => {
    const handler = handlers.find(h => h.name === handlerName)
    if (!handler) return
    const newHandler = { name: handlerName, params: {} }
    if (handlerName === 'ColumnMappingHandler') {
      newHandler.params = { mapping: {} }
    } else if (handlerName === 'DropNaHandler') {
      newHandler.params = { subset: [] }
    } else if (handlerName === 'TypeConversionHandler') {
      newHandler.params = {}
    } else if (handlerName === 'DatabaseSaveHandler') {
      newHandler.params = { target_table_id: null, conflict_mode: 'upsert' }
    }
    updateForm('pipeline_config', [...form.pipeline_config, newHandler])
  }

  const removeHandler = (index) => {
    updateForm('pipeline_config', form.pipeline_config.filter((_, i) => i !== index))
  }

  const moveHandler = (index, direction) => {
    const newPipeline = [...form.pipeline_config]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= newPipeline.length) return
    ;[newPipeline[index], newPipeline[newIndex]] = [newPipeline[newIndex], newPipeline[index]]
    updateForm('pipeline_config', newPipeline)
  }

  const updateHandlerParams = (index, params) => {
    const newPipeline = [...form.pipeline_config]
    newPipeline[index] = { ...newPipeline[index], params }
    updateForm('pipeline_config', newPipeline)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (taskId) {
        await api.updateETLConfig(taskId, form)
      } else {
        await api.createETLConfig(form)
      }
      onNavigate('etl')
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => onNavigate('etl')} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{taskId ? '编辑任务' : '新建任务'}</h2>
          <p className="mt-1 text-slate-600">配置 ETL 数据处理流程</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`stepper-dot ${step > s ? 'completed' : step === s ? 'active' : 'inactive'}`}>
              {step > s ? '✓' : s}
            </div>
            <span className={`ml-2 font-medium ${step >= s ? 'text-slate-800' : 'text-slate-400'}`}>
              {s === 1 ? '数据源' : s === 2 ? 'Pipeline' : '运行参数'}
            </span>
            {s < 3 && (
              <div className={`w-12 h-1 mx-4 rounded-full transition-colors duration-300 ${step > s ? 'bg-success-500' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: 数据源 */}
      {step === 1 && (
        <div className="card space-y-5">
          <div>
            <label className="form-label">任务名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              className="input-field"
              placeholder="例如：导入 A 股日线数据"
            />
          </div>
          <div>
            <label className="form-label">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              className="input-field resize-none"
              rows={2}
              placeholder="任务描述（可选）"
            />
          </div>
          <div>
            <label className="form-label">数据源类型</label>
            <select
              value={form.source_type}
              onChange={(e) => updateForm('source_type', e.target.value)}
              className="input-field"
            >
              <option value="csv_dir">CSV 文件夹</option>
            </select>
          </div>
          <div>
            <label className="form-label">数据源路径</label>
            <FilePathPicker
              value={form.source_config}
              onChange={(config) => updateForm('source_config', config)}
              placeholder="选择或输入数据源路径"
            />
            <div className="mt-3">
              <button
                onClick={handlePreview}
                disabled={previewLoading || !form.source_config.path}
                className="btn-secondary flex items-center gap-2"
              >
                {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                预览数据
              </button>
            </div>
          </div>
          {columns.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-success-50 to-emerald-50 rounded-xl border border-success-200">
              <p className="text-sm font-medium text-success-700 mb-3">✓ 检测到 {columns.length} 个字段：</p>
              <div className="flex flex-wrap gap-2">
                {columns.map((col) => (
                  <span key={col} className="px-3 py-1.5 bg-white rounded-lg text-sm text-slate-700 shadow-sm border border-slate-100">{col}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Pipeline */}
      {step === 2 && (
        <div className="card space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">处理链路</h3>
              <p className="text-sm text-slate-500 mt-1">按顺序添加数据处理步骤</p>
            </div>
            <select
              onChange={(e) => { if (e.target.value) { addHandler(e.target.value); e.target.value = '' } }}
              className="input-field w-auto min-w-[180px]"
              defaultValue=""
            >
              <option value="" disabled>+ 添加处理器</option>
              {handlers.map((h) => (
                <option key={h.name} value={h.name}>{h.label || h.name}</option>
              ))}
            </select>
          </div>

          {form.pipeline_config.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <div className="text-slate-400 mb-2">📦</div>
              <p className="text-slate-500">暂无处理器</p>
              <p className="text-sm text-slate-400 mt-1">从上方下拉菜单添加处理步骤</p>
            </div>
          ) : (
            <div className="space-y-3">
              {form.pipeline_config.map((handler, index) => (
                <HandlerCard
                  key={index}
                  handler={handler}
                  index={index}
                  columns={columns}
                  dataTables={dataTables}
                  onUpdate={(params) => updateHandlerParams(index, params)}
                  onRemove={() => removeHandler(index)}
                  onMoveUp={() => moveHandler(index, -1)}
                  onMoveDown={() => moveHandler(index, 1)}
                  isFirst={index === 0}
                  isLast={index === form.pipeline_config.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: 运行参数 */}
      {step === 3 && (
        <div className="card space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">批次大小</label>
              <input
                type="number"
                value={form.batch_size}
                onChange={(e) => updateForm('batch_size', parseInt(e.target.value) || 1000)}
                className="input-field"
                min={100}
                max={10000}
              />
              <p className="form-hint">每批处理的记录数，建议 1000-5000</p>
            </div>
            <div>
              <label className="form-label">并行进程数</label>
              <input
                type="number"
                value={form.workers}
                onChange={(e) => updateForm('workers', parseInt(e.target.value) || 1)}
                className="input-field"
                min={1}
                max={16}
              />
              <p className="form-hint">并行执行的进程数量，建议 1-4</p>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
            <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 text-sm">📋</span>
              配置预览
            </h4>
            <pre className="text-xs text-slate-600 overflow-auto max-h-48 bg-white p-4 rounded-lg border border-slate-200">
              {JSON.stringify(form, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          上一步
        </button>
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} className="btn-primary flex items-center gap-2">
            下一步
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
        )}
      </div>
    </div>
  )
}

function HandlerCard({ handler, index, columns, dataTables, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const handlerLabels = {
    ColumnMappingHandler: '列名映射',
    DropNaHandler: '删除空值',
    TypeConversionHandler: '类型转换',
    DatabaseSaveHandler: '数据入库',
  }

  const handlerIcons = {
    ColumnMappingHandler: '🔄',
    DropNaHandler: '🧹',
    TypeConversionHandler: '🔧',
    DatabaseSaveHandler: '💾',
  }

  return (
    <div className="p-5 border border-slate-200 rounded-xl bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{handlerIcons[handler.name] || '⚙️'}</span>
          <div>
            <span className="font-semibold text-slate-800">{handlerLabels[handler.name] || handler.name}</span>
            <span className="ml-2 text-xs text-slate-400">#{index + 1}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <button onClick={onMoveUp} disabled={isFirst} className="btn-icon !p-1.5 disabled:opacity-30">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="btn-icon !p-1.5 disabled:opacity-30">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button onClick={onRemove} className="btn-icon-danger !p-1.5">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {handler.name === 'ColumnMappingHandler' && (
        <MappingEditor
          mapping={handler.params.mapping || {}}
          columns={columns}
          onChange={(mapping) => onUpdate({ ...handler.params, mapping })}
        />
      )}

      {handler.name === 'DropNaHandler' && (
        <SubsetEditor
          subset={handler.params.subset || []}
          columns={columns}
          onChange={(subset) => onUpdate({ ...handler.params, subset })}
        />
      )}

      {handler.name === 'TypeConversionHandler' && (
        <TypeConversionEditor
          conversions={handler.params}
          columns={columns}
          onChange={onUpdate}
        />
      )}

      {handler.name === 'DatabaseSaveHandler' && (
        <DatabaseSaveEditor
          targetTableId={handler.params.target_table_id}
          conflictMode={handler.params.conflict_mode || 'upsert'}
          dataTables={dataTables}
          onChange={(updates) => onUpdate({ ...handler.params, ...updates })}
        />
      )}
    </div>
  )
}

function MappingEditor({ mapping, columns, onChange }) {
  const entries = Object.entries(mapping)
  const addMapping = () => onChange({ ...mapping, '': '' })
  const updateKey = (oldKey, newKey) => {
    const newMapping = { ...mapping }
    const value = newMapping[oldKey]
    delete newMapping[oldKey]
    newMapping[newKey] = value
    onChange(newMapping)
  }
  const updateValue = (key, value) => onChange({ ...mapping, [key]: value })
  const removeMapping = (key) => {
    const newMapping = { ...mapping }
    delete newMapping[key]
    onChange(newMapping)
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, value], i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors">
          {columns.length > 0 ? (
            <select value={key} onChange={(e) => updateKey(key, e.target.value)} className="input-field flex-1 !bg-white">
              <option value="">选择源字段</option>
              {columns.map((col) => <option key={col} value={col}>{col}</option>)}
            </select>
          ) : (
            <input type="text" value={key} onChange={(e) => updateKey(key, e.target.value)} className="input-field flex-1 !bg-white" placeholder="源字段" />
          )}
          <span className="text-primary-400 font-bold">→</span>
          <input type="text" value={value} onChange={(e) => updateValue(key, e.target.value)} className="input-field flex-1 !bg-white" placeholder="目标字段" />
          <button onClick={() => removeMapping(key)} className="btn-icon-danger !p-1.5 opacity-50 group-hover:opacity-100">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button onClick={addMapping} className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> 添加映射
      </button>
    </div>
  )
}

function SubsetEditor({ subset, columns, onChange }) {
  const toggle = (col) => {
    if (subset.includes(col)) {
      onChange(subset.filter(c => c !== col))
    } else {
      onChange([...subset, col])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(columns.length > 0 ? columns : subset).map((col) => (
          <label
            key={col}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
              subset.includes(col)
                ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <input type="checkbox" checked={subset.includes(col)} onChange={() => toggle(col)} className="sr-only" />
            <span className="text-sm font-medium">{col}</span>
            {subset.includes(col) && <span className="text-primary-500">✓</span>}
          </label>
        ))}
      </div>
      {columns.length === 0 && (
        <input
          type="text"
          placeholder="输入列名后回车添加"
          className="input-field"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value) {
              onChange([...subset, e.target.value])
              e.target.value = ''
            }
          }}
        />
      )}
    </div>
  )
}

function TypeConversionEditor({ conversions, columns, onChange }) {
  const entries = Object.entries(conversions)
  const types = ['datetime', 'float', 'int', 'string']
  const typeLabels = { datetime: '日期时间', float: '浮点数', int: '整数', string: '字符串' }
  const addConversion = () => onChange({ ...conversions, '': 'string' })
  const updateKey = (oldKey, newKey) => {
    const newConversions = { ...conversions }
    const value = newConversions[oldKey]
    delete newConversions[oldKey]
    newConversions[newKey] = value
    onChange(newConversions)
  }
  const updateValue = (key, value) => onChange({ ...conversions, [key]: value })
  const removeConversion = (key) => {
    const newConversions = { ...conversions }
    delete newConversions[key]
    onChange(newConversions)
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, value], i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors">
          {columns.length > 0 ? (
            <select value={key} onChange={(e) => updateKey(key, e.target.value)} className="input-field flex-1 !bg-white">
              <option value="">选择字段</option>
              {columns.map((col) => <option key={col} value={col}>{col}</option>)}
            </select>
          ) : (
            <input type="text" value={key} onChange={(e) => updateKey(key, e.target.value)} className="input-field flex-1 !bg-white" placeholder="字段名" />
          )}
          <span className="text-primary-400 font-bold">→</span>
          <select value={value} onChange={(e) => updateValue(key, e.target.value)} className="input-field flex-1 !bg-white">
            {types.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}
          </select>
          <button onClick={() => removeConversion(key)} className="btn-icon-danger !p-1.5 opacity-50 group-hover:opacity-100">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button onClick={addConversion} className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> 添加转换
      </button>
    </div>
  )
}

function DatabaseSaveEditor({ targetTableId, conflictMode, dataTables, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="form-label">目标数据表</label>
        <select
          value={targetTableId || ''}
          onChange={(e) => onChange({ target_table_id: e.target.value ? parseInt(e.target.value) : null })}
          className="input-field"
        >
          <option value="">请选择数据表</option>
          {dataTables.map((table) => (
            <option key={table.id} value={table.id}>
              {table.name} ({table.table_name})
            </option>
          ))}
        </select>
        {dataTables.length === 0 && (
          <p className="form-hint text-warning-600">暂无数据表，请先在"数据表"页面创建</p>
        )}
      </div>

      <div>
        <label className="form-label">冲突处理模式 (写入策略)</label>
        <select
          value={conflictMode || 'upsert'}
          onChange={(e) => onChange({ conflict_mode: e.target.value })}
          className="input-field"
        >
          <option value="upsert">更新 (Upsert) - 存在则覆盖 (默认)</option>
          <option value="ignore">忽略 (Ignore) - 存在则跳过</option>
          <option value="insert">插入 (Insert) - 冲突则报错</option>
        </select>
        <p className="form-hint">
          {conflictMode === 'upsert' && '需要表定义主键或唯一索引。'}
          {conflictMode === 'ignore' && '需要表定义主键或唯一索引。'}
          {conflictMode === 'insert' && '最高效。但如果数据重复会写入失败。'}
        </p>
      </div>
    </div>
  )
}

export default ETLTaskEditor
