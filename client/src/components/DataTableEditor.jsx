import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Loader2, Plus, Trash2, GripVertical, X } from 'lucide-react'
import api from '../services/api'

const COLUMN_TYPES = [
  { value: 'VARCHAR(20)', label: 'VARCHAR(20)', hint: '短文本 (代码)' },
  { value: 'VARCHAR(100)', label: 'VARCHAR(100)', hint: '中等文本 (名称)' },
  { value: 'TIMESTAMPTZ', label: 'TIMESTAMPTZ', hint: '带时区时间' },
  { value: 'DOUBLE PRECISION', label: 'DOUBLE PRECISION', hint: '双精度浮点 (价格)' },
  { value: 'NUMERIC', label: 'NUMERIC', hint: '高精度小数 (财务)' },
  { value: 'INT', label: 'INT', hint: '整数' },
  { value: 'BIGINT', label: 'BIGINT', hint: '大整数 (成交量)' },
  { value: 'BOOLEAN', label: 'BOOLEAN', hint: '布尔值' },
  { value: 'JSONB', label: 'JSONB', hint: '非结构化数据' },
]

function DataTableEditor({ tableId, cloneFromId, onNavigate }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    name: '',
    table_name: '',
    category_id: '', // Changed from category string to category_id
    description: '',
    status: 'DRAFT',
    columns_schema: [],
    indexes_schema: [],
  })

  useEffect(() => {
    loadData()
  }, [tableId, cloneFromId])

  const loadData = async () => {
    try {
      setLoading(true)
      // Load categories first
      const cats = await api.getTableCategories()
      setCategories(cats)
      
      // Default to first category if creating new
      let initialCategoryId = cats.length > 0 ? cats[0].id : ''

      if (tableId) {
        const data = await api.getDataTable(tableId)
        // Ensure arrays exist
        data.columns_schema = data.columns_schema || []
        data.indexes_schema = data.indexes_schema || []
        data.indexes_schema.forEach(idx => {
          idx.columns = idx.columns || []
        })
        setForm(data)
      } else if (cloneFromId) {
        const data = await api.getDataTable(cloneFromId)
        // Ensure arrays exist
        data.columns_schema = data.columns_schema || []
        data.indexes_schema = data.indexes_schema || []
        data.indexes_schema.forEach(idx => {
          idx.columns = idx.columns || []
        })
        setForm({
          ...data,
          id: undefined, // Clear ID to create new
          name: `${data.name} (副本)`,
          table_name: `${data.table_name}_copy`,
          status: 'DRAFT',
          // Keep other fields like columns, indexes, category, description
        })
      } else {
        setForm(prev => ({ ...prev, category_id: initialCategoryId }))
      }
    } catch (err) {
      console.error(err)
      setError('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Handle category_id as integer
  const handleCategoryChange = (e) => {
    const val = parseInt(e.target.value, 10)
    updateForm('category_id', val)
  }

  // Use status lowercase check to match backend
  const isPublished = form.status === 'created' || form.status === 'CREATED'

  // Column operations
  const addColumn = () => {
    updateForm('columns_schema', [...form.columns_schema, { name: '', type: 'VARCHAR(20)', is_pk: false, comment: '' }])
  }

  const updateColumn = (index, field, value) => {
    const cols = [...form.columns_schema]
    cols[index] = { ...cols[index], [field]: value }
    updateForm('columns_schema', cols)
  }

  const removeColumn = (index) => {
    updateForm('columns_schema', form.columns_schema.filter((_, i) => i !== index))
  }

  // Index operations
  const addIndex = () => {
    updateForm('indexes_schema', [...form.indexes_schema, { name: '', columns: [], unique: false }])
  }

  const updateIndex = (index, field, value) => {
    const idxs = [...form.indexes_schema]
    idxs[index] = { ...idxs[index], [field]: value }
    updateForm('indexes_schema', idxs)
  }

  const removeIndex = (index) => {
    updateForm('indexes_schema', form.indexes_schema.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!form.name || !form.table_name || !form.description || !form.category_id) {
      setError('请填写所有必填项')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (tableId) {
        await api.updateDataTable(tableId, form)
      } else {
        await api.createDataTable(form)
      }
      onNavigate('tables')
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败')
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

  const columnNames = form.columns_schema.map(c => c.name).filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => onNavigate('tables')} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-slate-800">{tableId ? '编辑数据表' : '新建数据表'}</h2>
          <p className="mt-1 text-slate-600">配置数据表元数据信息</p>
        </div>
        {isPublished && (
          <span className="px-3 py-1 bg-success-100 text-success-700 rounded-full text-sm font-medium">已发布</span>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* Section A: 基础信息 */}
      <div className="card space-y-5">
        <h3 className="font-semibold text-slate-800 border-b pb-2">基础信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="form-label">显示名称 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              className="input-field"
              placeholder="例如：A股日线行情"
            />
          </div>
          <div>
            <label className="form-label">物理表名 *</label>
            <input
              type="text"
              value={form.table_name}
              onChange={(e) => updateForm('table_name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="input-field"
              placeholder="例如：daily_bars"
              disabled={isPublished}
            />
            <p className="form-hint">只能包含小写字母、数字和下划线{isPublished && ' (已发布表不可重命名)'}</p>
          </div>
        </div>

        <div>
          <label className="form-label">分类 *</label>
          <select
            value={form.category_id}
            onChange={handleCategoryChange}
            className="input-field"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name} ({cat.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">描述 *</label>
          <textarea
            value={form.description}
            onChange={(e) => updateForm('description', e.target.value)}
            className="input-field resize-none"
            rows={2}
            placeholder="数据表描述（必填）"
          />
        </div>
      </div>

      {/* Section B: 字段定义 */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold text-slate-800">字段定义</h3>
          <button onClick={addColumn} className="btn-secondary flex items-center gap-1 text-sm">
            <Plus className="w-4 h-4" /> 添加字段
          </button>
        </div>

        {form.columns_schema.length === 0 ? (
          <div className="text-center py-8 text-slate-400">暂无字段，点击上方按钮添加</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 w-8"></th>
                  <th className="text-left py-2 px-2">列名</th>
                  <th className="text-left py-2 px-2">类型</th>
                  <th className="text-center py-2 px-2 w-16">主键</th>
                  <th className="text-left py-2 px-2">描述</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {form.columns_schema.map((col, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-2 text-slate-300"><GripVertical className="w-4 h-4" /></td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => updateColumn(i, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="input-field !py-1"
                        placeholder="column_name"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={col.type}
                        onChange={(e) => updateColumn(i, 'type', e.target.value)}
                        className="input-field !py-1"
                      >
                        {COLUMN_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={col.is_pk}
                        onChange={(e) => updateColumn(i, 'is_pk', e.target.checked)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={col.comment}
                        onChange={(e) => updateColumn(i, 'comment', e.target.value)}
                        className="input-field !py-1"
                        placeholder="字段描述"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => removeColumn(i)} className="btn-icon-danger !p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section C: 索引定义 */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800">索引定义</h3>
            <p className="text-xs text-slate-500">支持联合索引，通过添加多个列来组合</p>
          </div>
          <button onClick={addIndex} className="btn-secondary flex items-center gap-1 text-sm">
             <Plus className="w-4 h-4" /> 添加索引
          </button>
        </div>

        {form.indexes_schema.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            暂无索引配置
          </div>
        ) : (
          <div className="space-y-3">
            {form.indexes_schema.map((idx, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-primary-200 transition-colors">
                
                {/* 索引名称 */}
                <div className="w-full sm:w-48">
                  <label className="block text-xs font-medium text-slate-500 mb-1">索引名称</label>
                  <input
                    type="text"
                    value={idx.name}
                    onChange={(e) => updateIndex(i, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="input-field !py-1.5 w-full"
                    placeholder="例如: idx_symbol_date"
                  />
                </div>

                {/* 索引列 (Tag Editor) */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">索引列组合 (联合索引)</label>
                  <div className="flex flex-wrap gap-2 min-h-[38px] p-1.5 bg-slate-50 rounded border border-slate-200">
                    {idx.columns.map((colName, colIdx) => (
                      <span key={colIdx} className="inline-flex items-center px-2 py-1 rounded bg-white border border-slate-200 text-sm text-slate-700 shadow-sm">
                        {colName}
                        <button
                          onClick={() => {
                            const newCols = idx.columns.filter((_, ci) => ci !== colIdx)
                            updateIndex(i, 'columns', newCols)
                          }}
                          className="ml-1.5 text-slate-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    
                    <div className="relative group">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value && !idx.columns.includes(e.target.value)) {
                            updateIndex(i, 'columns', [...idx.columns, e.target.value])
                          }
                        }}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                      >
                        <option value="">添加列...</option>
                        {columnNames.filter(c => !idx.columns.includes(c)).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1 px-2 py-1 text-sm text-slate-500 border border-dashed border-slate-300 rounded hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all bg-white">
                        <Plus className="w-3 h-3" /> 添加列
                      </div>
                    </div>
                  </div>
                </div>

                {/* 唯一性开关 */}
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={idx.unique}
                        onChange={(e) => updateIndex(i, 'unique', e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                    </div>
                    <span className="text-sm text-slate-600">唯一索引</span>
                  </label>
                </div>

                {/* 删除按钮 */}
                <div className="pt-5">
                  <button onClick={() => removeIndex(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="删除索引">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <button onClick={() => onNavigate('tables')} className="btn-secondary">取消</button>
        <button
          onClick={handleSave}
          disabled={saving || !form.name || !form.table_name || !form.description || !form.category_id}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存内容
        </button>
      </div>
    </div>
  )
}

export default DataTableEditor