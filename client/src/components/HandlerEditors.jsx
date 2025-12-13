import { Plus, Trash2 } from 'lucide-react'

export function MappingEditor({ mapping = {}, columns = [], onChange }) {
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

export function SubsetEditor({ subset = [], columns = [], onChange }) {
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

export function TypeConversionEditor({ conversions = {}, columns = [], onChange }) {
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

export function DatabaseSaveEditor({ targetTableId, conflictMode, dataTables = [], onChange }) {
  // Ensure dataTables is an array to prevent crashes
  const safeDataTables = Array.isArray(dataTables) ? dataTables : []
  
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
          {safeDataTables.map((table) => (
            <option key={table.id} value={table.id}>
              {table.name} ({table.table_name})
            </option>
          ))}
        </select>
        {safeDataTables.length === 0 && (
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
